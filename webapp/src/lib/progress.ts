// THE completion derivation. Single source of truth (docs/wiki/webapp-data-model.md).
//
// Pure function over (manifest, activity rows). No DB access, no I/O — which is why it can be
// unit-tested exhaustively and why both the UI and /admin can call it and never disagree.
//
// SQL must never re-implement any of this. Reporting reads completion_events; it does not
// recompute completion (adr/2026-08-01-06). The unit is the LESSON — one authored article, one
// page (adr/2026-08-04-11); it used to be the section.

import type { Lesson, Manifest } from "@/content/types";

/** A quiz passes at score >= ceil(0.7 * total): all-correct for 1–2 questions, 3/4 for the module quiz. */
export const QUIZ_PASS_THRESHOLD = 0.7;

/** A video counts as watched at 90% of its duration, measured by the high-water mark. */
export const VIDEO_COMPLETE_RATIO = 0.9;

export function passingScore(total: number): number {
  return Math.ceil(QUIZ_PASS_THRESHOLD * total);
}

export function isPassing(score: number, total: number): boolean {
  return total > 0 && score >= passingScore(total);
}

/** Whether a video's watched fraction counts as complete. Guards against a missing/zero duration. */
export function isVideoComplete(maxPositionSeconds: number, durationSeconds: number | null): boolean {
  if (!durationSeconds || durationSeconds <= 0) return false;
  return maxPositionSeconds / durationSeconds >= VIDEO_COMPLETE_RATIO;
}

// --- activity input --------------------------------------------------------

export type ActivityRows = {
  /** Video ids the user has completed (video_progress.completed_at IS NOT NULL). */
  completedVideoIds: Iterable<string>;
  /** Lesson keys with at least one passing attempt. */
  passedLessonKeys: Iterable<string>;
  /** manual_completions.item_key values — free-form reveals AND read view-only lessons. */
  manualCompletionKeys: Iterable<string>;
};

export type LessonRequirements = {
  /**
   * The video this lesson must have watched, if any.
   *
   * Null in three cases, all deliberate: the lesson has no video; it only *points at* one another
   * lesson owns; or its video is a debrief. Debriefs are never a requirement — gating a hands-on
   * exercise on watching its walkthrough would be backwards.
   */
  videoId: string | null;
  /** This lesson is a gradeable quiz that must be passed. */
  quiz: boolean;
  /** This lesson is a free-form assessment whose model answer must be revealed. */
  freeform: boolean;
  /** No other requirement — the lesson is complete once it has been read. */
  viewOnly: boolean;
};

export type LessonProgress = {
  lessonKey: string;
  slug: string;
  module: number;
  complete: boolean;
  requirements: LessonRequirements;
  /** Which requirements are satisfied — drives the per-lesson state in the UI. */
  met: { video: boolean; quiz: boolean; freeform: boolean; viewed: boolean };
  /** 0..1, for progress bars. */
  fraction: number;
};

export type ModuleProgress = {
  module: number;
  title: string;
  complete: boolean;
  lessonKeys: string[];
  completeLessonKeys: string[];
};

export type DerivedProgress = {
  /** Keyed by lesson key (the source path), which is what the activity tables store. */
  lessons: Map<string, LessonProgress>;
  modules: Map<number, ModuleProgress>;
};

/** What a lesson requires in order to count as complete. */
export function lessonRequirements(lesson: Lesson): LessonRequirements {
  const videoId = lesson.video?.required && lesson.video.playerOn === null ? lesson.video.videoId : null;
  const quiz = lesson.assessment?.kind === "quiz";
  const freeform = lesson.assessment?.kind === "freeform";

  return { videoId, quiz, freeform, viewOnly: videoId === null && !quiz && !freeform };
}

export function deriveProgress(manifest: Manifest, activity: ActivityRows): DerivedProgress {
  const completedVideos = new Set(activity.completedVideoIds);
  const passedLessons = new Set(activity.passedLessonKeys);
  const manualKeys = new Set(activity.manualCompletionKeys);

  const lessons = new Map<string, LessonProgress>();

  for (const lesson of manifest.lessons) {
    const req = lessonRequirements(lesson);

    const videoMet = req.videoId !== null && completedVideos.has(req.videoId);
    const quizMet = req.quiz && passedLessons.has(lesson.key);
    // A revealed model answer and a read view-only lesson are both manual_completions rows; which
    // one a key means is decided by the lesson's requirements, never by the row itself.
    const freeformMet = req.freeform && manualKeys.has(lesson.key);
    const viewedMet = req.viewOnly && manualKeys.has(lesson.key);

    // Every requirement the lesson HAS must be met.
    const complete =
      (req.videoId === null || videoMet) &&
      (!req.quiz || quizMet) &&
      (!req.freeform || freeformMet) &&
      (!req.viewOnly || viewedMet);

    const total =
      (req.videoId ? 1 : 0) + (req.quiz ? 1 : 0) + (req.freeform ? 1 : 0) + (req.viewOnly ? 1 : 0);
    const done =
      (videoMet ? 1 : 0) + (quizMet ? 1 : 0) + (freeformMet ? 1 : 0) + (viewedMet ? 1 : 0);

    lessons.set(lesson.key, {
      lessonKey: lesson.key,
      slug: lesson.slug,
      module: lesson.module,
      complete,
      requirements: req,
      met: { video: videoMet, quiz: quizMet, freeform: freeformMet, viewed: viewedMet },
      fraction: total === 0 ? (complete ? 1 : 0) : done / total,
    });
  }

  const modules = new Map<number, ModuleProgress>();
  for (const m of manifest.modules) {
    const completeLessonKeys = m.lessonKeys.filter((k) => lessons.get(k)?.complete);
    modules.set(m.module, {
      module: m.module,
      title: m.title,
      // A module is complete iff all of its lessons are.
      complete: completeLessonKeys.length === m.lessonKeys.length,
      lessonKeys: m.lessonKeys,
      completeLessonKeys,
    });
  }

  return { lessons, modules };
}

/**
 * Whether every lesson in a module EXCEPT one is complete.
 *
 * This is what unlocks a "Congrats, you completed this module" lesson. It has to exclude itself or
 * it can never be true: that lesson is view-only, so reading it would complete it, which would
 * complete the module, which is the thing it is meant to be reporting.
 */
export function moduleCompleteExcluding(
  derived: DerivedProgress,
  module: number,
  lessonKey: string
): boolean {
  const mod = derived.modules.get(module);
  if (!mod) return false;
  return mod.lessonKeys.every((k) => k === lessonKey || derived.lessons.get(k)?.complete);
}

/**
 * Completion keys currently earned, as `completion_events` rows would express them.
 * Callers diff this against what is already stored and append only the difference.
 */
export function earnedCompletionKeys(
  derived: DerivedProgress
): { itemType: "lesson" | "module"; itemId: string }[] {
  const out: { itemType: "lesson" | "module"; itemId: string }[] = [];
  for (const l of derived.lessons.values())
    if (l.complete) out.push({ itemType: "lesson", itemId: l.lessonKey });
  for (const m of derived.modules.values())
    if (m.complete) out.push({ itemType: "module", itemId: String(m.module) });
  return out;
}
