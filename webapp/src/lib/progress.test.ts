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
  passingScore,
  sectionRequirements,
} from "./progress.ts";
import type { Manifest, Section } from "../content/types.ts";

// --- fixtures --------------------------------------------------------------

function section(over: Partial<Section> & { id: string; module: number }): Section {
  return {
    section: 1,
    title: "T",
    moduleTitle: "M",
    video: null,
    debriefVideo: null,
    articles: [],
    ...over,
  } as Section;
}

const article = (key: string, kind: "quiz" | "freeform" | null) =>
  ({
    key,
    title: key,
    type: "Checkpoint",
    durationMin: 1,
    blocks: [],
    assessment: kind === null ? null : kind === "quiz" ? { kind, questions: [], trailing: [] } : { kind },
  }) as Section["articles"][number];

function manifestOf(sections: Section[]): Manifest {
  const modules = [...new Set(sections.map((s) => s.module))].map((m) => ({
    module: m,
    title: `Module ${m}`,
    sectionIds: sections.filter((s) => s.module === m).map((s) => s.id),
  }));
  return {
    modules,
    sections,
    zeroRequirementSections: sections.filter((s) => sectionRequirements(s).manualOnly).map((s) => s.id),
  };
}

const empty = { completedVideoIds: [], passedArticleKeys: [], manualCompletionKeys: [] };

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

test("a debrief-only section requires no video", () => {
  // The four cumulative-task sections ship only a debrief. Gating them on watching the answer
  // video would invert the exercise.
  const s = section({
    id: "m2-09",
    module: 2,
    video: null,
    debriefVideo: { videoId: "m2-09-cumulative-debrief", path: "module-2/m2-09-cumulative-debrief.mp4" },
    articles: [article("a/free.md", "freeform")],
  });
  const req = sectionRequirements(s);
  assert.equal(req.videoId, null);
  assert.deepEqual(req.freeformArticleKeys, ["a/free.md"]);
  assert.equal(req.manualOnly, false);
});

test("a section with no video and no assessment is manual-only", () => {
  const s = section({ id: "m3-09-module-complete", module: 3 });
  assert.equal(sectionRequirements(s).manualOnly, true);
});

// --- derivation ------------------------------------------------------------

test("video-only section completes when its video completes", () => {
  const s = section({
    id: "m1-01",
    module: 1,
    video: { videoId: "m1-01-orientation", path: "module-1/m1-01-orientation.mp4" },
  });
  const m = manifestOf([s]);

  assert.equal(deriveProgress(m, empty).sections.get("m1-01")!.complete, false);
  assert.equal(
    deriveProgress(m, { ...empty, completedVideoIds: ["m1-01-orientation"] }).sections.get("m1-01")!
      .complete,
    true
  );
});

test("watching the debrief does not complete a section", () => {
  const s = section({
    id: "m2-09",
    module: 2,
    debriefVideo: { videoId: "m2-09-cumulative-debrief", path: "x.mp4" },
    articles: [article("free.md", "freeform")],
  });
  const m = manifestOf([s]);
  const d = deriveProgress(m, { ...empty, completedVideoIds: ["m2-09-cumulative-debrief"] });
  assert.equal(d.sections.get("m2-09")!.complete, false, "debrief must not satisfy anything");
});

test("every requirement a section has must be met", () => {
  const s = section({
    id: "m1-06",
    module: 1,
    video: { videoId: "m1-06-module-wrap-up", path: "x.mp4" },
    articles: [article("quiz.md", "quiz"), article("ex.md", "quiz"), article("free.md", "freeform")],
  });
  const m = manifestOf([s]);

  const partial = deriveProgress(m, {
    completedVideoIds: ["m1-06-module-wrap-up"],
    passedArticleKeys: ["quiz.md"],
    manualCompletionKeys: ["free.md"],
  });
  assert.equal(partial.sections.get("m1-06")!.complete, false, "one quiz still unpassed");
  assert.equal(partial.sections.get("m1-06")!.fraction, 3 / 4);

  const full = deriveProgress(m, {
    completedVideoIds: ["m1-06-module-wrap-up"],
    passedArticleKeys: ["quiz.md", "ex.md"],
    manualCompletionKeys: ["free.md"],
  });
  assert.equal(full.sections.get("m1-06")!.complete, true);
  assert.equal(full.sections.get("m1-06")!.fraction, 1);
});

test("manual-only section completes via its own section id, not an article key", () => {
  const s = section({ id: "m3-09-module-complete", module: 3 });
  const m = manifestOf([s]);

  assert.equal(deriveProgress(m, empty).sections.get("m3-09-module-complete")!.complete, false);
  assert.equal(
    deriveProgress(m, { ...empty, manualCompletionKeys: ["m3-09-module-complete"] }).sections.get(
      "m3-09-module-complete"
    )!.complete,
    true
  );
});

test("a module completes only when all its sections do", () => {
  const a = section({ id: "m1-01", module: 1, video: { videoId: "v1", path: "x" } });
  const b = section({ id: "m1-02", module: 1, video: { videoId: "v2", path: "x" } });
  const m = manifestOf([a, b]);

  const one = deriveProgress(m, { ...empty, completedVideoIds: ["v1"] });
  assert.equal(one.modules.get(1)!.complete, false);
  assert.deepEqual(one.modules.get(1)!.completeSectionIds, ["m1-01"]);

  const both = deriveProgress(m, { ...empty, completedVideoIds: ["v1", "v2"] });
  assert.equal(both.modules.get(1)!.complete, true);
});

test("earned completion keys cover sections and modules", () => {
  const a = section({ id: "m1-01", module: 1, video: { videoId: "v1", path: "x" } });
  const m = manifestOf([a]);
  const keys = earnedCompletionKeys(deriveProgress(m, { ...empty, completedVideoIds: ["v1"] }));

  assert.deepEqual(keys, [
    { itemType: "section", itemId: "m1-01" },
    { itemType: "module", itemId: "1" },
  ]);
  assert.deepEqual(earnedCompletionKeys(deriveProgress(m, empty)), []);
});
