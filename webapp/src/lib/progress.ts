// THE completion derivation. Single source of truth (docs/wiki/webapp-data-model.md).
//
// Pure function over (manifest, activity rows). No DB access, no I/O — which is why it can be
// unit-tested exhaustively and why both the UI and /admin can call it and never disagree.
//
// SQL must never re-implement any of this. Reporting reads completion_events; it does not
// recompute completion (adr/2026-08-01-06).

import type { Manifest, Section } from "@/content/types";

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
  /** Article keys with at least one passing attempt. */
  passedArticleKeys: Iterable<string>;
  /** manual_completions.item_key values — free-form reveals AND videoless section ids. */
  manualCompletionKeys: Iterable<string>;
};

export type SectionRequirements = {
  /** The section's main video, if it has one. Debriefs are excluded by design. */
  videoId: string | null;
  gradeableArticleKeys: string[];
  freeformArticleKeys: string[];
  /** True when the section has no requirements at all and needs an explicit "Mark complete". */
  manualOnly: boolean;
};

export type SectionProgress = {
  sectionId: string;
  module: number;
  complete: boolean;
  requirements: SectionRequirements;
  /** Which requirements are satisfied — drives the per-section checklist in the UI. */
  met: { video: boolean; quizzes: string[]; freeform: string[]; manual: boolean };
  /** 0..1, for progress bars. A section with no requirements is 0 or 1, never fractional. */
  fraction: number;
};

export type ModuleProgress = {
  module: number;
  title: string;
  complete: boolean;
  sectionIds: string[];
  completeSectionIds: string[];
};

export type DerivedProgress = {
  sections: Map<string, SectionProgress>;
  modules: Map<number, ModuleProgress>;
};

/**
 * What a section requires in order to count as complete.
 *
 * Note the deliberate asymmetry: a section's MAIN video is a requirement, a debrief video never
 * is. Four sections (the cumulative tasks) have only a debrief — those are hands-on exercises, and
 * gating them on watching the answer video would be backwards.
 */
export function sectionRequirements(section: Section): SectionRequirements {
  const gradeableArticleKeys = section.articles
    .filter((a) => a.assessment?.kind === "quiz")
    .map((a) => a.key);
  const freeformArticleKeys = section.articles
    .filter((a) => a.assessment?.kind === "freeform")
    .map((a) => a.key);
  const videoId = section.video?.videoId ?? null;

  return {
    videoId,
    gradeableArticleKeys,
    freeformArticleKeys,
    manualOnly:
      videoId === null && gradeableArticleKeys.length === 0 && freeformArticleKeys.length === 0,
  };
}

export function deriveProgress(manifest: Manifest, activity: ActivityRows): DerivedProgress {
  const completedVideos = new Set(activity.completedVideoIds);
  const passedArticles = new Set(activity.passedArticleKeys);
  const manualKeys = new Set(activity.manualCompletionKeys);

  const sections = new Map<string, SectionProgress>();

  for (const section of manifest.sections) {
    const req = sectionRequirements(section);

    const videoMet = req.videoId === null ? true : completedVideos.has(req.videoId);
    const quizzesMet = req.gradeableArticleKeys.filter((k) => passedArticles.has(k));
    const freeformMet = req.freeformArticleKeys.filter((k) => manualKeys.has(k));
    const manualMet = req.manualOnly ? manualKeys.has(section.id) : true;

    // Every requirement the section HAS must be met. A section with none of a given kind
    // trivially satisfies that kind.
    const complete =
      videoMet &&
      quizzesMet.length === req.gradeableArticleKeys.length &&
      freeformMet.length === req.freeformArticleKeys.length &&
      manualMet;

    const total =
      (req.videoId ? 1 : 0) +
      req.gradeableArticleKeys.length +
      req.freeformArticleKeys.length +
      (req.manualOnly ? 1 : 0);
    const done =
      (req.videoId && videoMet ? 1 : 0) +
      quizzesMet.length +
      freeformMet.length +
      (req.manualOnly && manualMet ? 1 : 0);

    sections.set(section.id, {
      sectionId: section.id,
      module: section.module,
      complete,
      requirements: req,
      met: {
        video: req.videoId ? videoMet : false,
        quizzes: quizzesMet,
        freeform: freeformMet,
        manual: req.manualOnly ? manualMet : false,
      },
      fraction: total === 0 ? (complete ? 1 : 0) : done / total,
    });
  }

  const modules = new Map<number, ModuleProgress>();
  for (const m of manifest.modules) {
    const completeSectionIds = m.sectionIds.filter((id) => sections.get(id)?.complete);
    modules.set(m.module, {
      module: m.module,
      title: m.title,
      // A module is complete iff all of its sections are.
      complete: completeSectionIds.length === m.sectionIds.length,
      sectionIds: m.sectionIds,
      completeSectionIds,
    });
  }

  return { sections, modules };
}

/**
 * Completion keys currently earned, as `completion_events` rows would express them.
 * Callers diff this against what is already stored and append only the difference.
 */
export function earnedCompletionKeys(
  derived: DerivedProgress
): { itemType: "section" | "module"; itemId: string }[] {
  const out: { itemType: "section" | "module"; itemId: string }[] = [];
  for (const s of derived.sections.values())
    if (s.complete) out.push({ itemType: "section", itemId: s.sectionId });
  for (const m of derived.modules.values())
    if (m.complete) out.push({ itemType: "module", itemId: String(m.module) });
  return out;
}
