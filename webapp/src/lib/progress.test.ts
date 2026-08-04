// Unit tests for THE completion derivation.
//
// Run: npm test   (node:test + type stripping — progress.ts has only type-only imports, so there
// is nothing to resolve at runtime and no build step is needed.)

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  deriveProgress,
  earnedCompletionKeys,
  isPassing,
  isVideoComplete,
  lessonRequirements,
  moduleCompleteExcluding,
  passingScore,
} from "./progress.ts";
import type { Lesson, LessonVideo, Manifest } from "../content/types.ts";

// --- fixtures --------------------------------------------------------------

let seq = 0;

function lesson(over: Partial<Lesson> & { key: string; module: number }): Lesson {
  return {
    slug: over.key,
    order: seq++,
    moduleTitle: "M",
    group: "G",
    groupOrder: 1,
    title: over.key,
    type: "Teaching",
    durationMin: 1,
    video: null,
    assessment: null,
    blocks: [],
    ...over,
  } as Lesson;
}

/** A video this lesson owns the player for. Debriefs are `required: false`. */
const owns = (videoId: string, required = true): LessonVideo => ({
  videoId,
  path: `x/${videoId}.mp4`,
  required,
  playerOn: null,
});

/** A video another lesson owns the player for — this lesson only links to it. */
const pointsAt = (videoId: string, ownerSlug: string): LessonVideo => ({
  videoId,
  path: `x/${videoId}.mp4`,
  required: true,
  playerOn: ownerSlug,
});

const quiz = { kind: "quiz", questions: [], trailing: [] } as Lesson["assessment"];
const freeform = { kind: "freeform" } as Lesson["assessment"];

function manifestOf(lessons: Lesson[]): Manifest {
  const modules = [...new Set(lessons.map((l) => l.module))].map((m) => ({
    module: m,
    title: `Module ${m}`,
    lessonKeys: lessons.filter((l) => l.module === m).map((l) => l.key),
  }));
  return {
    modules,
    lessons,
    viewOnlyLessonKeys: lessons.filter((l) => lessonRequirements(l).viewOnly).map((l) => l.key),
  };
}

const empty = { completedVideoIds: [], passedLessonKeys: [], manualCompletionKeys: [] };

// --- thresholds ------------------------------------------------------------

test("quiz pass threshold is ceil(0.7 * total)", () => {
  // The documented intent: all-correct for 1–2 question checkpoints, 3/4 for the module quiz.
  assert.equal(passingScore(1), 1);
  assert.equal(passingScore(2), 2);
  assert.equal(passingScore(3), 3);
  assert.equal(passingScore(4), 3);

  assert.equal(isPassing(1, 1), true);
  assert.equal(isPassing(1, 2), false);
  assert.equal(isPassing(3, 4), true);
  assert.equal(isPassing(2, 4), false);
  assert.equal(isPassing(0, 0), false, "a zero-question quiz can never pass");
});

test("video completes at 90% of duration", () => {
  assert.equal(isVideoComplete(90, 100), true);
  assert.equal(isVideoComplete(89.9, 100), false);
  assert.equal(isVideoComplete(100, 100), true);
  assert.equal(isVideoComplete(50, null), false, "unknown duration never completes");
  assert.equal(isVideoComplete(50, 0), false, "zero duration must not divide by zero");
});

// --- requirements ----------------------------------------------------------

test("a debrief video is never a requirement", () => {
  // The cumulative tasks and every checkpoint ship only a walkthrough. Gating them on watching the
  // answer video would invert the exercise.
  const l = lesson({
    key: "cumulative.md",
    module: 2,
    video: owns("m2-09-cumulative-debrief", false),
    assessment: freeform,
  });
  const req = lessonRequirements(l);
  assert.equal(req.videoId, null);
  assert.equal(req.freeform, true);
  assert.equal(req.viewOnly, false);
});

test("a lesson that only points at another lesson's video requires nothing to watch", () => {
  // The watch-out story is narrated inside the teaching lesson's video; only that lesson requires it.
  const l = lesson({
    key: "watch-out.md",
    module: 3,
    video: pointsAt("m3-02-permission-modes", "teaching"),
  });
  const req = lessonRequirements(l);
  assert.equal(req.videoId, null);
  assert.equal(req.viewOnly, true, "nothing to watch here and nothing to answer");
});

test("a lesson with no video of its own and no assessment is view-only", () => {
  assert.equal(lessonRequirements(lesson({ key: "glossary.md", module: 3 })).viewOnly, true);
});

// --- derivation ------------------------------------------------------------

test("a video lesson completes when its video completes", () => {
  const l = lesson({ key: "orientation.md", module: 1, video: owns("m1-01-orientation") });
  const m = manifestOf([l]);

  assert.equal(deriveProgress(m, empty).lessons.get("orientation.md")!.complete, false);
  assert.equal(
    deriveProgress(m, { ...empty, completedVideoIds: ["m1-01-orientation"] }).lessons.get(
      "orientation.md"
    )!.complete,
    true
  );
});

test("watching a debrief does not complete its lesson", () => {
  const l = lesson({
    key: "cumulative.md",
    module: 2,
    video: owns("m2-09-cumulative-debrief", false),
    assessment: freeform,
  });
  const m = manifestOf([l]);
  const d = deriveProgress(m, { ...empty, completedVideoIds: ["m2-09-cumulative-debrief"] });
  assert.equal(d.lessons.get("cumulative.md")!.complete, false, "debrief must not satisfy anything");
});

test("a view-only lesson completes via a manual_completions row on its own key", () => {
  const l = lesson({ key: "glossary.md", module: 3 });
  const m = manifestOf([l]);

  assert.equal(deriveProgress(m, empty).lessons.get("glossary.md")!.complete, false);
  assert.equal(
    deriveProgress(m, { ...empty, manualCompletionKeys: ["glossary.md"] }).lessons.get("glossary.md")!
      .complete,
    true
  );
});

test("a quiz lesson needs a passing attempt, not a manual completion", () => {
  const l = lesson({ key: "quiz.md", module: 1, assessment: quiz });
  const m = manifestOf([l]);

  assert.equal(
    deriveProgress(m, { ...empty, manualCompletionKeys: ["quiz.md"] }).lessons.get("quiz.md")!
      .complete,
    false,
    "a manual row must not stand in for passing"
  );
  assert.equal(
    deriveProgress(m, { ...empty, passedLessonKeys: ["quiz.md"] }).lessons.get("quiz.md")!.complete,
    true
  );
});

test("a lesson with both a video and an assessment needs both", () => {
  const l = lesson({
    key: "teaching.md",
    module: 1,
    video: owns("v1"),
    assessment: quiz,
  });
  const m = manifestOf([l]);

  const partial = deriveProgress(m, { ...empty, completedVideoIds: ["v1"] });
  assert.equal(partial.lessons.get("teaching.md")!.complete, false);
  assert.equal(partial.lessons.get("teaching.md")!.fraction, 1 / 2);

  const full = deriveProgress(m, { completedVideoIds: ["v1"], passedLessonKeys: ["teaching.md"], manualCompletionKeys: [] });
  assert.equal(full.lessons.get("teaching.md")!.complete, true);
  assert.equal(full.lessons.get("teaching.md")!.fraction, 1);
});

test("a module completes only when all its lessons do", () => {
  const a = lesson({ key: "a.md", module: 1, video: owns("v1") });
  const b = lesson({ key: "b.md", module: 1, video: owns("v2") });
  const m = manifestOf([a, b]);

  const one = deriveProgress(m, { ...empty, completedVideoIds: ["v1"] });
  assert.equal(one.modules.get(1)!.complete, false);
  assert.deepEqual(one.modules.get(1)!.completeLessonKeys, ["a.md"]);

  const both = deriveProgress(m, { ...empty, completedVideoIds: ["v1", "v2"] });
  assert.equal(both.modules.get(1)!.complete, true);
});

// --- module-complete gating -------------------------------------------------

test("moduleCompleteExcluding ignores the lesson doing the asking", () => {
  const a = lesson({ key: "a.md", module: 1, video: owns("v1") });
  const congrats = lesson({ key: "congrats.md", module: 1, type: "Module Complete" });
  const m = manifestOf([a, congrats]);

  const none = deriveProgress(m, empty);
  assert.equal(moduleCompleteExcluding(none, 1, "congrats.md"), false);

  const rest = deriveProgress(m, { ...empty, completedVideoIds: ["v1"] });
  assert.equal(
    moduleCompleteExcluding(rest, 1, "congrats.md"),
    true,
    "unlocks once everything else is done, without needing to read itself first"
  );
  assert.equal(
    rest.modules.get(1)!.complete,
    false,
    "the module itself is still incomplete until the congrats lesson is read"
  );
});

test("earned completion keys cover lessons and modules", () => {
  const a = lesson({ key: "a.md", module: 1, video: owns("v1") });
  const m = manifestOf([a]);
  const keys = earnedCompletionKeys(deriveProgress(m, { ...empty, completedVideoIds: ["v1"] }));

  assert.deepEqual(keys, [
    { itemType: "lesson", itemId: "a.md" },
    { itemType: "module", itemId: "1" },
  ]);
  assert.deepEqual(earnedCompletionKeys(deriveProgress(m, empty)), []);
});
