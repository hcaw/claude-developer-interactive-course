// Generate the webapp's static course content from the pipeline's outputs.
//
//   ../build/bundles/*.json         (npm run parse at the repo root)  -> lessons, blocks, answer keys
//   ../video-scripts/*/script.json  (`covers` field)                  -> which lessons a video narrates
//   ../output/module-N/*.mp4        (rendered videos)                 -> existence + path
//
// Emits three files into src/content/:
//   manifest.json        client-safe: lessons, blocks, quiz questions WITHOUT answers
//   answer-key.json      server-only: correct letters, explanations, model answers
//   content-report.json  what was generated + which lessons tripped a known anomaly
//
// A LESSON is one authored article file — one page, one URL, one unit of completion
// (adr/2026-08-04-11). Sections survive only as the `group` heading a lesson is listed under.
//
// Invariant (adr/2026-08-01-04): answer keys never reach the client. Every object written to the
// manifest is built field-by-field below — nothing is spread from a bundle, so an `answerKey` on a
// source article cannot leak through by accident.
//
// Usage: node scripts/generate-content.mjs [--check]
//   --check  regenerate into memory and diff against the committed files; exit 1 on drift.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBAPP = join(HERE, "..");
const ROOT = join(WEBAPP, "..");
const BUNDLES = join(ROOT, "build", "bundles");
const OUTPUT = join(ROOT, "output");
const VIDEO_SCRIPTS = join(ROOT, "video-scripts");
const CONTENT = join(WEBAPP, "src", "content");

const CHECK = process.argv.includes("--check");

// --- classification rules (docs/wiki/course-content-inventory.md) -----------

const ASSESSMENT_TYPES = new Set(["Checkpoint", "Quiz", "Exercise", "Cumulative"]);
const OPTION_ITEM = /^\*\*([A-F])[.)]\*\*\s*(.*)$/;
// One letter ("Answer: B") or a comma-separated set ("Answer: C, D") for multi-select questions
// (adr/2026-08-04-12). The letters become a set; grading is all-or-nothing per question.
const ANSWER_PARA = /^\*\*Answer:\s*([A-F](?:\s*,\s*[A-F])*)\*\*\s*(.*)$/s;

const answerLetters = (text) => ANSWER_PARA.exec(text)[1].split(/\s*,\s*/).map((s) => s.toUpperCase());

// An assessment with option lists but a mismatched answer count is mis-authored; the count-match
// rule demotes it to free-form, and the generator fails loudly unless the key is listed here.
// Empty since adr/2026-08-04-12 normalized every checkpoint — keep it that way.
const KNOWN_ANOMALIES = new Set([]);

const isOptionList = (b) =>
  b.type === "list" && b.items.length > 0 && b.items.every((i) => OPTION_ITEM.test(i));

const isAnswerPara = (b) => b.type === "paragraph" && ANSWER_PARA.test(b.text);

// --- lesson slugs ----------------------------------------------------------

/**
 * URL slug for a lesson: `m{module}-{section dir without its number}-{article file stem}`.
 *
 * The section number is dropped (sections are not a concept in the app) but the article's number
 * is kept, because it is what makes the slug unique — m4-04 has two `teaching` and two `checkpoint`
 * articles. Uniqueness is asserted below rather than assumed.
 */
function lessonSlug(sectionId, file) {
  const moduleNumber = /^m(\d+)-/.exec(sectionId)[1];
  const sectionDir = sectionId.replace(/^m\d+-/, "").replace(/^\d+-/, "");
  const stem = basename(file, ".md");
  return `m${moduleNumber}-${sectionDir}-${stem}`;
}

// --- video index -----------------------------------------------------------

/**
 * Every rendered video, with the lessons it narrates.
 *
 * The join is the script's own `covers` list, NOT a filename prefix: one video routinely narrates a
 * teaching article and its watch-out story, and two videos have basenames that don't match their
 * source directory at all. A prefix rule cannot express either (adr/2026-08-04-11).
 */
function indexVideos(report) {
  const videos = [];

  if (!existsSync(OUTPUT)) {
    report.errors.push(`output/ not found at ${OUTPUT} — render videos or the manifest will have none`);
    return videos;
  }
  if (!existsSync(VIDEO_SCRIPTS)) {
    report.errors.push(`video-scripts/ not found at ${VIDEO_SCRIPTS}`);
    return videos;
  }

  const mp4s = new Map();
  for (const dir of readdirSync(OUTPUT).filter((d) => /^module-\d+$/.test(d)).sort()) {
    for (const file of readdirSync(join(OUTPUT, dir)).filter((f) => f.endsWith(".mp4")).sort()) {
      const videoId = file.replace(/\.mp4$/, "");
      mp4s.set(videoId, `${dir}/${videoId}.mp4`);
    }
  }

  const scripted = new Set();
  for (const dir of readdirSync(VIDEO_SCRIPTS).filter((d) => !d.startsWith(".")).sort()) {
    const path = join(VIDEO_SCRIPTS, dir, "script.json");
    if (!existsSync(path)) {
      report.errors.push(`video-scripts/${dir}: no script.json`);
      continue;
    }
    const script = JSON.parse(readFileSync(path, "utf8"));
    const videoId = dir;
    scripted.add(videoId);

    if (!mp4s.has(videoId)) {
      report.errors.push(`video-scripts/${dir}: no rendered output/**/${videoId}.mp4`);
      continue;
    }
    if (!Array.isArray(script.covers) || script.covers.length === 0) {
      report.errors.push(`video-scripts/${dir}: script.json needs a non-empty \`covers\` array`);
      continue;
    }

    videos.push({
      videoId,
      path: mp4s.get(videoId),
      covers: script.covers,
      // A debrief reveals answers. It is tracked for resume but is never a completion requirement
      // — gating a hands-on exercise on watching its walkthrough would be backwards.
      required: !videoId.endsWith("-debrief"),
    });
  }

  for (const videoId of mp4s.keys())
    if (!scripted.has(videoId))
      report.errors.push(`output/${mp4s.get(videoId)}: no video-scripts/${videoId}/script.json`);

  return videos;
}

// --- assessment parsing ----------------------------------------------------

/**
 * Split a gradeable lesson's learner blocks into intro + questions.
 * Question prompt = nearest preceding heading plus any blocks between it and the option list.
 *
 * Also returns, per question, what the guards need: the option letters and the option list's
 * source position — and any block index that landed in NO slice (historically those were dropped
 * silently, which is exactly how content went missing).
 */
function parseQuestions(blocks) {
  const listIdxs = blocks.map((b, i) => (isOptionList(b) ? i : -1)).filter((i) => i >= 0);
  const questions = [];
  const meta = [];
  const covered = new Set();
  let firstStart = blocks.length;

  for (const listIdx of listIdxs) {
    let start = listIdx;
    while (start > 0 && blocks[start - 1].type !== "heading") start--;
    if (start > 0) start--; // include the heading itself
    firstStart = Math.min(firstStart, start);

    for (let i = start; i <= listIdx; i++) covered.add(i);

    const options = blocks[listIdx].items.map((item) => {
      const [, letter, text] = OPTION_ITEM.exec(item);
      return { letter, text: text.trim() };
    });
    questions.push({ prompt: blocks.slice(start, listIdx).map(cleanBlock), options });
    meta.push({ srcIdx: blocks[listIdx].srcIdx ?? null, letters: options.map((o) => o.letter) });
  }

  const lastList = listIdxs[listIdxs.length - 1];
  for (let i = 0; i < firstStart; i++) covered.add(i);
  for (let i = lastList + 1; i < blocks.length; i++) covered.add(i);
  const uncovered = blocks.map((_, i) => i).filter((i) => !covered.has(i));

  return {
    intro: blocks.slice(0, firstStart).map(cleanBlock),
    questions,
    trailing: blocks.slice(lastList + 1).map(cleanBlock),
    meta,
    uncovered,
  };
}

// --- content guards (adr/2026-08-04-12) ------------------------------------
//
// Every checkpoint is normalized (adr/2026-08-04-12), so content that leaks a verdict or loses
// its task to the answer-key split is a build failure, not a warning. Do not flip this back —
// weaken a specific guard with a reasoned whitelist instead if content ever needs an exception.
const STRICT_GUARDS = true;

const flag = (report, msg) => (STRICT_GUARDS ? report.errors : report.warnings).push(msg);

/** A table cell that pronounces a verdict has no business in learner-visible content. */
const VERDICT_CELL = /^(correct|wrong|right)\s*$/i;

function checkVerdictTables(key, where, blocks, report) {
  for (const b of blocks || []) {
    if (b?.type !== "table") continue;
    if (b.rows.some((row) => row.some((cell) => VERDICT_CELL.test(cell))))
      flag(report, `${key}: ${where} table contains a Correct/Wrong verdict cell — answers must live under a key heading`);
  }
}

/** Whitelist block fields by type. Anything unknown is dropped rather than passed through. */
function cleanBlock(b) {
  switch (b.type) {
    case "heading":
      return { type: "heading", level: b.level, text: b.text };
    case "paragraph":
      return { type: "paragraph", text: b.text };
    case "list":
      return { type: "list", items: b.items };
    case "callout":
      return { type: "callout", label: b.label ?? null, text: b.text, disclaimer: !!b.disclaimer };
    case "table":
      return { type: "table", rows: b.rows };
    case "code":
      return { type: "code", lang: b.lang || "text", code: b.code };
    default:
      return null;
  }
}

const normalizeTitle = (s) => String(s).replace(/\s+/g, " ").trim();

/**
 * Drop the leading `# Title` every article opens with.
 *
 * The page already renders the title from frontmatter, next to the lesson-type badge, so keeping
 * the heading block printed it twice. Stripping it here rather than in 107 markdown files keeps
 * each file a valid standalone document. A leading H1 that does NOT match the frontmatter title is
 * a real content anomaly and fails the build.
 */
function stripTitleHeading(blocks, title, key, report) {
  const first = blocks[0];
  if (!first || first.type !== "heading" || first.level !== 1) return blocks;
  if (normalizeTitle(first.text) !== normalizeTitle(title)) {
    report.errors.push(
      `${key}: leading H1 "${first.text}" does not match the frontmatter title "${title}"`
    );
    return blocks;
  }
  report.droppedTitleHeadings++;
  return blocks.slice(1);
}

// --- main ------------------------------------------------------------------

function generate() {
  // No timestamp on purpose: the report is committed, so it must be a pure function of the
  // inputs or every regeneration would show a spurious diff.
  const report = {
    bundles: 0,
    modules: 0,
    lessons: 0,
    videos: 0,
    lessonsWithVideo: 0,
    gradeableLessons: 0,
    quizQuestions: 0,
    freeformLessons: 0,
    viewOnlyLessons: 0,
    droppedTitleHeadings: 0,
    knownAnomalies: [],
    errors: [],
    warnings: [],
  };

  if (!existsSync(BUNDLES)) {
    console.error(`No bundles at ${BUNDLES}. Run \`npm run parse\` at the repo root first.`);
    process.exit(1);
  }

  const files = readdirSync(BUNDLES).filter((f) => f.endsWith(".json") && f !== "_report.json");
  report.bundles = files.length;

  const lessons = [];
  const answerKey = {};

  for (const file of files) {
    const b = JSON.parse(readFileSync(join(BUNDLES, file), "utf8"));

    for (const a of b.articles) {
      report.lessons++;
      const key = a.file;
      const type = a.frontmatter.article_type;
      const title = a.frontmatter.title;
      const blocks = stripTitleHeading(a.blocks, title, key, report);

      const base = {
        key,
        slug: lessonSlug(b.sectionId, a.file),
        module: b.module,
        moduleTitle: b.moduleTitle,
        group: b.sectionTitle,
        groupOrder: b.section,
        articleOrder: a.frontmatter.article,
        title,
        type,
        durationMin: a.durationMin,
      };

      if (!ASSESSMENT_TYPES.has(type)) {
        lessons.push({ ...base, assessment: null, blocks: blocks.map(cleanBlock).filter(Boolean) });
        continue;
      }

      const optionLists = blocks.filter(isOptionList);
      const answerParas = (a.answerKey || []).filter(isAnswerPara);
      const gradeable = optionLists.length >= 1 && optionLists.length === answerParas.length;

      if (gradeable) {
        report.gradeableLessons++;
        report.quizQuestions += optionLists.length;
        const { intro, questions, trailing, meta, uncovered } = parseQuestions(blocks);

        // Questions and answer paragraphs are index-paired; grading is positional, so a wrong
        // pairing mis-grades silently. These guards make the failure modes loud instead.
        answerParas.forEach((p, i) => {
          const letters = answerLetters(p.text);
          questions[i].multi = letters.length > 1;

          for (const letter of letters)
            if (!meta[i].letters.includes(letter))
              report.errors.push(`${key}: question ${i + 1} answer letter ${letter} is not one of its options (${meta[i].letters.join("")})`);
          if (new Set(letters).size !== letters.length)
            report.errors.push(`${key}: question ${i + 1} repeats a letter in its answer`);

          // The answer paragraph must sit between its own option list and the next one.
          const at = p.srcIdx;
          const list = meta[i].srcIdx;
          const nextList = meta[i + 1]?.srcIdx ?? Infinity;
          if (at != null && list != null && !(at > list && at < nextList))
            report.errors.push(`${key}: answer ${i + 1} is not adjacent to option list ${i + 1} in the source — positional grading would mis-pair`);

          if (questions[i].multi && !questions[i].prompt.some((b) => /select/i.test(b?.text ?? "")))
            report.warnings.push(`${key}: multi-select question ${i + 1} never says "select" in its prompt`);
        });

        if (uncovered.length > 0)
          flag(report, `${key}: ${uncovered.length} learner block(s) fall between questions and would be dropped (indices ${uncovered.join(", ")})`);
        checkVerdictTables(key, "intro/prompt", [...intro, ...questions.flatMap((q) => q.prompt)], report);
        checkVerdictTables(key, "trailing", trailing, report);

        lessons.push({
          ...base,
          assessment: { kind: "quiz", questions, trailing: trailing.filter(Boolean) },
          blocks: intro.filter(Boolean),
        });

        // Server-only: letters, explanations, and everything after the answer paragraphs.
        const answerIdxs = (a.answerKey || []).map((k, i) => (isAnswerPara(k) ? i : -1)).filter((i) => i >= 0);
        const lastAnswerIdx = answerIdxs[answerIdxs.length - 1];
        answerKey[key] = {
          kind: "quiz",
          answers: answerParas.map((p) => {
            const [, lettersRaw, explanation] = ANSWER_PARA.exec(p.text);
            return { letters: lettersRaw.split(/\s*,\s*/).map((s) => s.toUpperCase()), explanation: explanation.trim() };
          }),
          debrief: (a.answerKey || []).slice(lastAnswerIdx + 1).map(cleanBlock).filter(Boolean),
        };
        continue;
      }

      // Not gradeable. If it still had option lists, the counts disagreed — that is an anomaly.
      if (optionLists.length > 0) {
        const entry = `${key} (option lists: ${optionLists.length}, answer paragraphs: ${answerParas.length})`;
        if (KNOWN_ANOMALIES.has(key)) report.knownAnomalies.push(entry);
        else report.errors.push(`NEW ANOMALY ${entry} — classify it before shipping`);
      }

      report.freeformLessons++;
      const freeformBlocks = blocks.map(cleanBlock).filter(Boolean);
      // A free-form task whose learner content is a single sentence lost its stems to the
      // answer-key split — the m5-04 "place the work" class of authoring bug.
      if (freeformBlocks.length < 2)
        flag(report, `${key}: free-form lesson has only ${freeformBlocks.length} learner block(s) — its task content is probably trapped in the answer key`);
      checkVerdictTables(key, "learner", freeformBlocks, report);
      lessons.push({
        ...base,
        assessment: { kind: "freeform" },
        blocks: freeformBlocks,
      });
      answerKey[key] = {
        kind: "freeform",
        modelAnswer: (a.answerKey || []).map(cleanBlock).filter(Boolean),
      };
    }
  }

  // Course order: module, then the source section's number, then the article's number.
  lessons.sort(
    (x, y) => x.module - y.module || x.groupOrder - y.groupOrder || x.articleOrder - y.articleOrder
  );
  lessons.forEach((l, i) => {
    l.order = i;
    delete l.articleOrder; // an authoring detail; `order` is what the app navigates by
  });

  const bySlug = new Map();
  for (const l of lessons) {
    if (bySlug.has(l.slug)) report.errors.push(`duplicate lesson slug ${l.slug} (${l.key})`);
    bySlug.set(l.slug, l);
  }

  // --- attach videos -------------------------------------------------------
  const videos = indexVideos(report);
  report.videos = videos.length;
  const byKey = new Map(lessons.map((l) => [l.key, l]));

  for (const v of videos) {
    const covered = [];
    for (const key of v.covers) {
      const lesson = byKey.get(key);
      if (!lesson) {
        report.errors.push(`${v.videoId}: covers "${key}", which is not a lesson`);
        continue;
      }
      if (lesson.video) {
        report.errors.push(
          `${lesson.key}: covered by both ${lesson.video.videoId} and ${v.videoId} — a lesson may have at most one video`
        );
        continue;
      }
      covered.push(lesson);
    }
    // The earliest lesson in course order renders the player; the rest link back to it, so a
    // 4-minute video is never embedded twice on two consecutive pages.
    covered.sort((x, y) => x.order - y.order);
    for (const [i, lesson] of covered.entries()) {
      lesson.video = {
        videoId: v.videoId,
        path: v.path,
        required: v.required,
        playerOn: i === 0 ? null : covered[0].slug,
      };
      report.lessonsWithVideo++;
    }
  }

  const modules = [];
  for (const l of lessons) {
    let m = modules.find((x) => x.module === l.module);
    if (!m) modules.push((m = { module: l.module, title: l.moduleTitle, lessonKeys: [] }));
    m.lessonKeys.push(l.key);
  }
  report.modules = modules.length;

  // Normalize field order so the committed JSON is stable regardless of which branch built it.
  const ordered = lessons.map((l) => ({
    key: l.key,
    slug: l.slug,
    order: l.order,
    module: l.module,
    moduleTitle: l.moduleTitle,
    group: l.group,
    groupOrder: l.groupOrder,
    title: l.title,
    type: l.type,
    durationMin: l.durationMin,
    video: l.video ?? null,
    assessment: l.assessment,
    blocks: l.blocks,
  }));

  // A lesson with nothing to watch and nothing to answer is completed by reading it
  // (adr/2026-08-04-11). Generated, never hand-listed — it is the whitelist /api/progress/complete
  // accepts, so it must stay a closed set.
  const viewOnly = ordered
    .filter((l) => !l.assessment && !(l.video?.required && l.video.playerOn === null))
    .map((l) => l.key);
  report.viewOnlyLessons = viewOnly.length;

  return {
    manifest: { modules, lessons: ordered, viewOnlyLessonKeys: viewOnly },
    answerKey,
    report,
  };
}

// --- leak guard ------------------------------------------------------------

/**
 * Assert that nothing which reveals a CORRECT answer sits in the client-safe manifest.
 *
 * Subtlety: several checkpoints are "pick from a visible bank" exercises. The learner is shown
 * every token (that is the exercise), and the model answer names one of them — so answer text
 * overlapping manifest text is expected and safe there. What must never appear is the prose that
 * says WHICH one is right: `**Answer: X**` markers, per-answer explanations, and the "Why" /
 * feedback-branch commentary. So overlap is only tolerated when the answer text is verbatim one of
 * the options already displayed for that same lesson.
 */
function verifyNoAnswerLeak(manifest, answerKey, report) {
  const manifestStr = JSON.stringify(manifest);

  if (/\*\*Answer:/.test(manifestStr))
    report.errors.push("LEAK: an `**Answer:` marker reached the manifest");

  const lessons = new Map(manifest.lessons.map((l) => [l.key, l]));

  const textOf = (b) => (b.type === "list" ? b.items.join("\n") : b.text || b.code || "").trim();

  for (const [key, entry] of Object.entries(answerKey)) {
    const lesson = lessons.get(key);
    if (!lesson) continue;

    // Everything already on the page for this lesson: option banks, prompts, code, prose.
    const visible = new Set();
    const collect = (blocks) => {
      for (const b of blocks || []) {
        if (b.type === "list") for (const i of b.items) visible.add(i.trim());
        visible.add(textOf(b));
      }
    };
    collect(lesson.blocks);
    for (const q of lesson.assessment?.questions || []) {
      collect(q.prompt);
      for (const o of q.options) visible.add(o.text.trim());
    }
    collect(lesson.assessment?.trailing);

    const suspects = [
      ...(entry.answers || []).map((a) => a.explanation),
      ...(entry.debrief || []).map(textOf),
      ...(entry.modelAnswer || []).map(textOf),
    ];

    for (const raw of suspects) {
      const probe = String(raw).replace(/^[—–-]\s*/, "").trim();
      if (probe.length <= 25) continue; // too short to identify anything on its own
      if (visible.has(probe)) continue; // a choice the learner can already see — expected
      if (manifestStr.includes(probe))
        report.errors.push(`LEAK: answer-key text reached the manifest (${key}): ${probe.slice(0, 80)}`);
    }
  }
}

// --- write / check ---------------------------------------------------------

const { manifest, answerKey, report } = generate();
verifyNoAnswerLeak(manifest, answerKey, report);

const stable = (o) => JSON.stringify(o, null, 2) + "\n";
const targets = [
  ["manifest.json", stable(manifest)],
  ["answer-key.json", stable(answerKey)],
];

if (report.errors.length) {
  console.error(`Content generation FAILED (${report.errors.length} error(s)):`);
  for (const e of report.errors) console.error("  " + e);
  process.exit(1);
}

if (CHECK) {
  let drift = 0;
  for (const [name, body] of targets) {
    const path = join(CONTENT, name);
    if (!existsSync(path) || readFileSync(path, "utf8") !== body) {
      console.error(`DRIFT: src/content/${name} is stale — run \`npm run content:gen\` and commit.`);
      drift++;
    }
  }
  if (drift) process.exit(1);
  console.log("Content is up to date.");
} else {
  mkdirSync(CONTENT, { recursive: true });
  for (const [name, body] of targets) writeFileSync(join(CONTENT, name), body);
  writeFileSync(join(CONTENT, "content-report.json"), stable(report));
  console.log(
    `Generated ${report.lessons} lessons across ${report.modules} modules ` +
      `(${report.gradeableLessons} gradeable, ${report.quizQuestions} questions, ` +
      `${report.freeformLessons} free-form, ${report.viewOnlyLessons} view-only).`
  );
  console.log(
    `${report.videos} videos attached to ${report.lessonsWithVideo} lessons; ` +
      `dropped ${report.droppedTitleHeadings} duplicate title headings.`
  );
  if (report.knownAnomalies.length)
    console.log(`Known anomalies demoted to free-form: ${report.knownAnomalies.length}`);
  for (const w of report.warnings) console.warn("  warning: " + w);
}
