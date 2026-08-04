// The video-progress upsert, isolated so it can be exercised against a real database.
//
// This is the trickiest write in the app and the one with the least forgiving failure mode: if
// `max_position_seconds` can move backwards, or `completed_at` can be cleared once set, learners
// silently lose completions. Both properties are enforced in SQL rather than in JS, because
// heartbeats overlap — a `sendBeacon` fired on pagehide routinely lands after the next page's
// first heartbeat, carrying an older position.
//
// It takes the db handle as an argument so tests can point it at a throwaway database instead of
// the app's TLS-verified pool.

import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { videoProgress } from "../db/schema.ts";
import { VIDEO_COMPLETE_RATIO } from "./progress.ts";

export type HeartbeatInput = {
  userId: string;
  videoId: string;
  /** Already validated and clamped by the caller. */
  position: number;
  duration: number | null;
};

export async function upsertVideoProgress(
  db: NodePgDatabase<Record<string, unknown>>,
  { userId, videoId, position, duration }: HeartbeatInput
): Promise<void> {
  const completedOnInsert =
    duration && duration > 0 && position / duration >= VIDEO_COMPLETE_RATIO ? new Date() : null;

  await db
    .insert(videoProgress)
    .values({
      userId,
      videoId,
      positionSeconds: position,
      maxPositionSeconds: position,
      durationSeconds: duration,
      completedAt: completedOnInsert,
    })
    .onConflictDoUpdate({
      target: [videoProgress.userId, videoProgress.videoId],
      set: {
        // The resume point follows the latest report, even backwards — that is where the user is.
        positionSeconds: sql`excluded.position_seconds`,
        // The high-water mark never retreats.
        maxPositionSeconds: sql`greatest(${videoProgress.maxPositionSeconds}, excluded.max_position_seconds)`,
        durationSeconds: sql`coalesce(excluded.duration_seconds, ${videoProgress.durationSeconds})`,
        // Set once, then frozen. Re-watching or seeking backwards must not un-complete a video.
        completedAt: sql`
          case
            when ${videoProgress.completedAt} is not null then ${videoProgress.completedAt}
            when coalesce(excluded.duration_seconds, ${videoProgress.durationSeconds}) > 0
             and greatest(${videoProgress.maxPositionSeconds}, excluded.max_position_seconds)
                 / coalesce(excluded.duration_seconds, ${videoProgress.durationSeconds})
                 >= ${VIDEO_COMPLETE_RATIO}
            then now()
            else null
          end`,
        updatedAt: sql`now()`,
      },
    });
}
