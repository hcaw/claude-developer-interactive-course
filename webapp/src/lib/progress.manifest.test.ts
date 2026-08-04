// Derivation tests against the REAL generated manifest.
//
// These pin the derivation to the actual course (docs/wiki/course-content-inventory.md). If a
// content edit changes which sections are gradeable, videoless, or debrief-only, these fail — which
// is the point: completion rules and content must move together.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { deriveProgress, sectionRequirements } from "./progress.ts";
import type { Manifest } from "../content/types.ts";

const manifest: Manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL("../content/manifest.json", import.meta.url)), "utf8")
);

test("manifest matches the documented course shape", () => {
  assert.equal(manifest.sections.length, 44);
  assert.equal(manifest.modules.length, 5);
  assert.equal(
    manifest.sections.reduce((n, s) => n + s.articles.length, 0),
    108
  );
  assert.deepEqual(
    manifest.modules.map((m) => m.sectionIds.length),
    [6, 11, 9, 9, 9]
  );
});

test("exactly two sections are manual-only", () => {
  const manualOnly = manifest.sections.filter((s) => sectionRequirements(s).manualOnly).map((s) => s.id);
  assert.deepEqual(manualOnly, ["m3-09-module-complete", "m4-09-module-complete"]);
  assert.deepEqual([...manifest.zeroRequirementSections].sort(), manualOnly.sort());
});

test("the four cumulative-task sections require no video", () => {
  const debriefOnly = manifest.sections
    .filter((s) => !s.video && s.debriefVideo)
    .map((s) => s.id);
  assert.deepEqual(debriefOnly, [
    "m2-09-cumulative-debug-task",
    "m3-07-cumulative-integration-task",
    "m4-07-cumulative-task",
    "m5-08-cumulative-task",
  ]);
  for (const id of debriefOnly) {
    const s = manifest.sections.find((x) => x.id === id)!;
    assert.equal(sectionRequirements(s).videoId, null, `${id} must not require its debrief`);
  }
});

test("eight articles across the course are gradeable", () => {
  const gradeable = manifest.sections.flatMap((s) =>
    s.articles.filter((a) => a.assessment?.kind === "quiz").map((a) => a.key)
  );
  assert.equal(gradeable.length, 8);
  const questions = manifest.sections.flatMap((s) =>
    s.articles.flatMap((a) => (a.assessment?.kind === "quiz" ? a.assessment.questions : []))
  );
  assert.equal(questions.length, 18);
  for (const q of questions) assert.ok(q.options.length >= 2, "every question needs options");
});

test("no progress at all means nothing is complete", () => {
  const d = deriveProgress(manifest, {
    completedVideoIds: [],
    passedArticleKeys: [],
    manualCompletionKeys: [],
  });
  assert.equal([...d.sections.values()].filter((s) => s.complete).length, 0);
  assert.equal([...d.modules.values()].filter((m) => m.complete).length, 0);
});

test("satisfying every requirement completes the whole course", () => {
  const completedVideoIds: string[] = [];
  const passedArticleKeys: string[] = [];
  const manualCompletionKeys: string[] = [];

  for (const s of manifest.sections) {
    const req = sectionRequirements(s);
    if (req.videoId) completedVideoIds.push(req.videoId);
    passedArticleKeys.push(...req.gradeableArticleKeys);
    manualCompletionKeys.push(...req.freeformArticleKeys);
    if (req.manualOnly) manualCompletionKeys.push(s.id);
  }

  const d = deriveProgress(manifest, {
    completedVideoIds,
    passedArticleKeys,
    manualCompletionKeys,
  });
  const incomplete = [...d.sections.values()].filter((s) => !s.complete).map((s) => s.sectionId);
  assert.deepEqual(incomplete, [], "every section should be complete");
  assert.equal([...d.modules.values()].every((m) => m.complete), true);
});

test("one missing requirement blocks exactly one section and its module", () => {
  const target = manifest.sections.find((s) => sectionRequirements(s).videoId)!;
  const completedVideoIds: string[] = [];
  const passedArticleKeys: string[] = [];
  const manualCompletionKeys: string[] = [];

  for (const s of manifest.sections) {
    const req = sectionRequirements(s);
    if (req.videoId && s.id !== target.id) completedVideoIds.push(req.videoId);
    passedArticleKeys.push(...req.gradeableArticleKeys);
    manualCompletionKeys.push(...req.freeformArticleKeys);
    if (req.manualOnly) manualCompletionKeys.push(s.id);
  }

  const d = deriveProgress(manifest, { completedVideoIds, passedArticleKeys, manualCompletionKeys });
  assert.equal(d.sections.get(target.id)!.complete, false);
  assert.equal(d.modules.get(target.module)!.complete, false);

  const otherModules = [...d.modules.values()].filter((m) => m.module !== target.module);
  assert.equal(otherModules.every((m) => m.complete), true, "other modules unaffected");
});
