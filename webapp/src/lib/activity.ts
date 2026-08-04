// Reading activity rows and turning writes into completion events.
//
// Every write route follows the same shape (docs/wiki/webapp-data-model.md):
//   write the activity row -> re-derive the user's progress -> append any newly earned events.
//
// `completion_events` is append-only and never read by the UI; the UI always derives live. The
// UNIQUE (user_id, item_type, item_id) constraint is what makes the append idempotent when two
// heartbeats race.

import "server-only";

import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { manifest } from "@/content/manifest";
import { db } from "@/db";
import {
  completionEvents,
  manualCompletions,
  quizAttempts,
  users,
  videoProgress,
} from "@/db/schema";
import { deriveProgress, earnedCompletionKeys, type DerivedProgress } from "@/lib/progress";

export async function loadActivity(userId: string) {
  const [videos, quizzes, manual] = await Promise.all([
    db
      .select({ videoId: videoProgress.videoId })
      .from(videoProgress)
      .where(and(eq(videoProgress.userId, userId), isNotNull(videoProgress.completedAt))),
    db
      .selectDistinct({ articleKey: quizAttempts.articleKey })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.passed, true))),
    db
      .select({ itemKey: manualCompletions.itemKey })
      .from(manualCompletions)
      .where(eq(manualCompletions.userId, userId)),
  ]);

  return {
    completedVideoIds: videos.map((v) => v.videoId),
    passedArticleKeys: quizzes.map((q) => q.articleKey),
    manualCompletionKeys: manual.map((m) => m.itemKey),
  };
}

/** Current progress for a user, derived live from their activity rows. */
export async function deriveForUser(userId: string): Promise<DerivedProgress> {
  return deriveProgress(manifest, await loadActivity(userId));
}

/** Resume points for a set of videos, keyed by video id. */
export async function loadVideoPositions(
  userId: string,
  videoIds: string[]
): Promise<Map<string, { position: number; completed: boolean }>> {
  if (videoIds.length === 0) return new Map();
  const rows = await db
    .select({
      videoId: videoProgress.videoId,
      position: videoProgress.positionSeconds,
      completedAt: videoProgress.completedAt,
    })
    .from(videoProgress)
    .where(and(eq(videoProgress.userId, userId), inArray(videoProgress.videoId, videoIds)));

  return new Map(
    rows.map((r) => [r.videoId, { position: r.position, completed: r.completedAt !== null }])
  );
}

/**
 * Append rows for anything newly complete. Safe to call after every write.
 *
 * We insert the full earned set and let ON CONFLICT DO NOTHING discard what is already recorded,
 * rather than reading first and diffing — that keeps it correct under concurrency without a
 * transaction, since the unique constraint is the arbiter.
 */
export async function syncCompletionEvents(
  userId: string,
  derived: DerivedProgress
): Promise<void> {
  const earned = earnedCompletionKeys(derived);
  if (earned.length === 0) return;

  await db
    .insert(completionEvents)
    .values(earned.map((e) => ({ userId, itemType: e.itemType, itemId: e.itemId })))
    .onConflictDoNothing();
}

/** The standard tail of every write route: re-derive, then record transitions. */
export async function deriveAndRecord(userId: string): Promise<DerivedProgress> {
  const derived = await deriveForUser(userId);
  await syncCompletionEvents(userId, derived);
  return derived;
}

// --- admin -----------------------------------------------------------------

export type UserProgressRow = {
  user: { id: string; email: string; name: string | null };
  derived: DerivedProgress;
  /** Best score per gradeable article, for the detail view. */
  bestScores: Map<string, { score: number; total: number; passed: boolean }>;
};

/**
 * Every user's progress, computed with the SAME derivation the learner UI uses.
 *
 * Four reads and one shared pure function — no SQL anywhere re-implements completion, which is what
 * keeps the admin view from ever disagreeing with what a learner sees (adr/2026-08-01-06).
 */
export async function loadAllUsersProgress(): Promise<UserProgressRow[]> {
  const [allUsers, videos, attempts, manual] = await Promise.all([
    db.select({ id: users.id, email: users.email, name: users.name }).from(users),
    db
      .select({ userId: videoProgress.userId, videoId: videoProgress.videoId })
      .from(videoProgress)
      .where(isNotNull(videoProgress.completedAt)),
    // Best attempt per (user, article): DISTINCT ON keeps the first row per group, so order by
    // score descending to make that the highest.
    db
      .selectDistinctOn([quizAttempts.userId, quizAttempts.articleKey], {
        userId: quizAttempts.userId,
        articleKey: quizAttempts.articleKey,
        score: quizAttempts.score,
        total: quizAttempts.total,
        passed: quizAttempts.passed,
      })
      .from(quizAttempts)
      .orderBy(quizAttempts.userId, quizAttempts.articleKey, desc(quizAttempts.score)),
    db
      .select({ userId: manualCompletions.userId, itemKey: manualCompletions.itemKey })
      .from(manualCompletions),
  ]);

  const group = <T extends { userId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) (m.get(r.userId) ?? m.set(r.userId, []).get(r.userId)!).push(r);
    return m;
  };

  const videosBy = group(videos);
  const attemptsBy = group(attempts);
  const manualBy = group(manual);

  return allUsers.map((user) => {
    const userAttempts = attemptsBy.get(user.id) ?? [];
    return {
      user,
      derived: deriveProgress(manifest, {
        completedVideoIds: (videosBy.get(user.id) ?? []).map((v) => v.videoId),
        passedArticleKeys: userAttempts.filter((a) => a.passed).map((a) => a.articleKey),
        manualCompletionKeys: (manualBy.get(user.id) ?? []).map((m) => m.itemKey),
      }),
      bestScores: new Map(
        userAttempts.map((a) => [a.articleKey, { score: a.score, total: a.total, passed: a.passed }])
      ),
    };
  });
}
