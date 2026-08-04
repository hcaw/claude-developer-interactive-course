// Derivation tests against the REAL generated manifest.
//
// These pin the derivation to the actual course (docs/wiki/course-content-inventory.md). If a
// content edit changes which lessons are gradeable, videoless, or view-only, these fail — which is
// the point: completion rules and content must move together.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { deriveProgress, lessonRequirements } from "./progress.ts";
import type { Manifest } from "../content/types.ts";

const manifest: Manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL("../content/manifest.json", import.meta.url)), "utf8")
);

test("manifest matches the documented course shape", () => {
  assert.equal(manifest.lessons.length, 108);
  assert.equal(manifest.modules.length, 5);
  assert.deepEqual(
    manifest.modules.map((m) => m.lessonKeys.length),
    [9, 29, 22, 23, 25]
  );
});

test("lesson slugs are unique and URL-safe", () => {
  const slugs = manifest.lessons.map((l) => l.slug);
  assert.equal(new Set(slugs).size, slugs.length, "a duplicate slug would make a page unreachable");
  for (const s of slugs) assert.match(s, /^[a-z0-9-]+$/, `${s} is not URL-safe`);
});

test("lessons are in course order", () => {
  manifest.lessons.forEach((l, i) => assert.equal(l.order, i));
});

test("only the four module glossaries have no video", () => {
  // Every other lesson is narrated somewhere — most videos cover a teaching lesson AND its
  // watch-out story (docs/wiki/course-content-inventory.md).
  const silent = manifest.lessons.filter((l) => !l.video);
  assert.deepEqual(
    silent.map((l) => l.slug),
    [
      "m2-module-wrap-up-02-glossary",
      "m3-key-takeaways-02-glossary",
      "m4-key-takeaways-02-glossary",
      "m5-key-takeaways-02-glossary",
    ]
  );
  for (const l of silent) assert.equal(l.type, "Glossary");
});

test("every video has exactly one lesson that owns its player", () => {
  const owners = new Map<string, string[]>();
  for (const l of manifest.lessons) {
    if (!l.video) continue;
    if (l.video.playerOn === null) {
      owners.set(l.video.videoId, [...(owners.get(l.video.videoId) ?? []), l.slug]);
    } else {
      // A pointer must aim at a real lesson that owns the SAME video.
      const target = manifest.lessons.find((x) => x.slug === l.video!.playerOn);
      assert.ok(target, `${l.slug} points at a lesson that does not exist`);
      assert.equal(target!.video?.videoId, l.video.videoId);
      assert.equal(target!.video?.playerOn, null);
    }
  }
  assert.equal(owners.size, 67, "67 rendered videos");
  for (const [videoId, slugs] of owners)
    assert.equal(slugs.length, 1, `${videoId} is owned by ${slugs.length} lessons`);
});

test("only a lesson that owns a non-debrief video requires watching it", () => {
  for (const l of manifest.lessons) {
    const req = lessonRequirements(l);
    if (req.videoId === null) continue;
    assert.equal(l.video?.playerOn, null, `${l.slug} requires a video it does not own`);
    assert.equal(l.video?.required, true, `${l.slug} requires a debrief`);
  }
});

// The full census of graded lessons: slug -> question count. A content batch that converts a
// checkpoint adds one line here — a self-documenting diff (adr/2026-08-04-12).
const GRADEABLE: Record<string, number> = {
  "m1-module-wrap-up-01-quiz": 4,
  "m1-module-wrap-up-02-exercise": 4,
  "m2-extended-thinking-02-checkpoint": 3,
  "m2-tool-use-and-schema-design-03-checkpoint": 1,
  "m2-context-engineering-03-checkpoint": 1,
  "m2-agent-memory-03-checkpoint": 3,
  "m2-multimodal-and-batch-ingestion-03-checkpoint": 3,
  "m3-permission-modes-and-human-gates-03-checkpoint": 2,
  "m3-durable-project-context-03-checkpoint": 2,
  "m3-packaging-workflows-02-checkpoint": 4,
  "m3-mcp-servers-03-checkpoint": 4,
  "m3-packaging-workflows-04-checkpoint": 2,
  "m3-enterprise-integration-03-checkpoint": 1,
  "m4-testing-and-tracing-03-checkpoint": 1,
  "m4-evals-and-judges-03-checkpoint": 5,
  "m4-cost-and-orchestration-03-checkpoint": 4,
  "m4-security-03-checkpoint": 1,
  "m4-failure-handling-and-model-selection-05-checkpoint": 3,
  "m5-contributing-back-03-checkpoint": 6,
  "m5-requirements-and-lifecycle-02-checkpoint": 2,
  "m5-requirements-and-lifecycle-04-checkpoint": 5,
  "m5-deployment-and-versioning-03-checkpoint": 4,
  "m5-comparing-platforms-03-checkpoint": 1,
  "m5-trust-boundaries-03-checkpoint": 2,
};

test("exactly the expected lessons are gradeable, with the expected question counts", () => {
  const gradeable = new Map(
    manifest.lessons
      .filter((l) => l.assessment?.kind === "quiz")
      .map((l) => [l.slug, l.assessment?.kind === "quiz" ? l.assessment.questions.length : 0])
  );
  assert.deepEqual(Object.fromEntries([...gradeable].sort()), GRADEABLE);
  assert.equal(
    [...gradeable.values()].reduce((a, b) => a + b, 0),
    Object.values(GRADEABLE).reduce((a, b) => a + b, 0)
  );
});

test("every question is well-formed", () => {
  for (const l of manifest.lessons) {
    if (l.assessment?.kind !== "quiz") continue;
    for (const [i, q] of l.assessment.questions.entries()) {
      assert.ok(q.options.length >= 2, `${l.slug} q${i + 1} needs at least two options`);
      if (q.multi)
        assert.ok(q.options.length >= 3, `${l.slug} q${i + 1} is multi-select with too few options`);
      assert.equal(typeof q.multi, "boolean", `${l.slug} q${i + 1} is missing the multi flag`);
    }
  }
});

test("viewOnlyLessonKeys is exactly the set with no other requirement", () => {
  const derived = manifest.lessons.filter((l) => lessonRequirements(l).viewOnly).map((l) => l.key);
  assert.deepEqual([...manifest.viewOnlyLessonKeys].sort(), derived.sort());
  // It is the whitelist /api/progress/complete accepts, so nothing gradeable may be in it.
  for (const key of manifest.viewOnlyLessonKeys) {
    const l = manifest.lessons.find((x) => x.key === key)!;
    assert.equal(l.assessment, null, `${key} has an assessment and must not be view-only`);
  }
});

test("every module-complete lesson is view-only", () => {
  // The page gates its content on the rest of the module; the lesson itself must be readable.
  const congrats = manifest.lessons.filter((l) => l.type === "Module Complete");
  assert.equal(congrats.length, 5);
  for (const l of congrats) assert.equal(lessonRequirements(l).viewOnly, true);
});

test("no lesson opens with a heading that repeats its title", () => {
  for (const l of manifest.lessons) {
    const first = l.blocks[0];
    if (first?.type !== "heading") continue;
    assert.notEqual(
      first.text.replace(/\s+/g, " ").trim(),
      l.title.replace(/\s+/g, " ").trim(),
      `${l.slug} still prints its title twice`
    );
  }
});

test("no progress at all means nothing is complete", () => {
  const d = deriveProgress(manifest, {
    completedVideoIds: [],
    passedLessonKeys: [],
    manualCompletionKeys: [],
  });
  assert.equal([...d.lessons.values()].filter((l) => l.complete).length, 0);
  assert.equal([...d.modules.values()].filter((m) => m.complete).length, 0);
});

/** Everything a learner would have to do to finish the course. */
function fullActivity(skipLessonKey?: string) {
  const completedVideoIds: string[] = [];
  const passedLessonKeys: string[] = [];
  const manualCompletionKeys: string[] = [];

  for (const l of manifest.lessons) {
    if (l.key === skipLessonKey) continue;
    const req = lessonRequirements(l);
    if (req.videoId) completedVideoIds.push(req.videoId);
    if (req.quiz) passedLessonKeys.push(l.key);
    if (req.freeform || req.viewOnly) manualCompletionKeys.push(l.key);
  }
  return { completedVideoIds, passedLessonKeys, manualCompletionKeys };
}

test("satisfying every requirement completes the whole course", () => {
  const d = deriveProgress(manifest, fullActivity());
  const incomplete = [...d.lessons.values()].filter((l) => !l.complete).map((l) => l.slug);
  assert.deepEqual(incomplete, [], "every lesson should be complete");
  assert.equal([...d.modules.values()].every((m) => m.complete), true);
});

test("one missing requirement blocks exactly one lesson and its module", () => {
  const target = manifest.lessons.find((l) => lessonRequirements(l).videoId)!;
  const d = deriveProgress(manifest, fullActivity(target.key));

  const incomplete = [...d.lessons.values()].filter((l) => !l.complete).map((l) => l.lessonKey);
  assert.deepEqual(incomplete, [target.key]);
  assert.equal(d.modules.get(target.module)!.complete, false);

  const otherModules = [...d.modules.values()].filter((m) => m.module !== target.module);
  assert.equal(otherModules.every((m) => m.complete), true, "other modules unaffected");
});
