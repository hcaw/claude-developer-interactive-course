// Generate the webapp's static course content from the pipeline's outputs.
//
//   ../build/bundles/*.json   (npm run parse at the repo root)   -> articles, blocks, answer keys
//   ../output/module-N/*.mp4  (rendered videos)                  -> existence check only
//
// Emits three files into src/content/:
//   manifest.json        client-safe: sections, articles, blocks, quiz questions WITHOUT answers
//   answer-key.json      server-only: correct letters, explanations, model answers
//   content-report.json  what was generated + which articles tripped a known anomaly
//
// Invariant (adr/2026-08-01-04): answer keys never reach the client. Every object written to the
// manifest is built field-by-field below — nothing is spread from a bundle, so an `answerKey` on a
// source article cannot leak through by accident.
//
// Usage: node scripts/generate-content.mjs [--check]
//   --check  regenerate into memory and diff against the committed files; exit 1 on drift.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBAPP = join(HERE, "..");
const ROOT = join(WEBAPP, "..");
const BUNDLES = join(ROOT, "build", "bundles");
const OUTPUT = join(ROOT, "output");
const CONTENT = join(WEBAPP, "src", "content");

const CHECK = process.argv.includes("--check");

// --- classification rules (docs/wiki/course-content-inventory.md) -----------

const ASSESSMENT_TYPES = new Set(["Checkpoint", "Quiz", "Exercise", "Cumulative"]);
const OPTION_ITEM = /^\*\*([A-F])[.)]\*\*\s*(.*)$/;
const ANSWER_PARA = /^\*\*Answer:\s*([A-F])\*\*\s*(.*)$/s;

// m2-04 and m2-06 carry a second option-shaped list that is per-option feedback and leaks the
// answer. The count-match rule correctly demotes them to free-form; they are whitelisted here so
// the generator can still fail loudly on any NEW anomaly.
const KNOWN_ANOMALIES = new Set([
  "course-content/module-2-production-grade-prompting-agents-and-tool-use/04-tool-use-and-schema-design/03-checkpoint.md",
  "course-content/module-2-production-grade-prompting-agents-and-tool-use/06-context-engineering/03-checkpoint.md",
]);

const isOptionList = (b) =>
  b.type === "list" && b.items.length > 0 && b.items.every((i) => OPTION_ITEM.test(i));

const isAnswerPara = (b) => b.type === "paragraph" && ANSWER_PARA.test(b.text);

/** Section id -> `m{module}-{NN}`. The ONLY valid video join key (never the full basename). */
const prefixOf = (id) => {
  const m = /^(m\d+-\d+)/.exec(id);
  return m ? m[1] : null;
};

// --- video index -----------------------------------------------------------

function indexVideos(report) {
  const byPrefix = new Map();
  if (!existsSync(OUTPUT)) {
    report.errors.push(`output/ not found at ${OUTPUT} — render videos or the manifest will have none`);
    return byPrefix;
  }
  for (const dir of readdirSync(OUTPUT).filter((d) => /^module-\d+$/.test(d)).sort()) {
    for (const file of readdirSync(join(OUTPUT, dir)).filter((f) => f.endsWith(".mp4")).sort()) {
      const videoId = file.replace(/\.mp4$/, "");
      const prefix = prefixOf(videoId);
      if (!prefix) {
        report.errors.push(`video ${dir}/${file}: cannot derive an m{module}-{NN} prefix`);
        continue;
      }
      if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
      byPrefix.get(prefix).push({ videoId, path: `${dir}/${videoId}.mp4` });
    }
  }
  return byPrefix;
}

// --- assessment parsing ----------------------------------------------------

/**
 * Split a gradeable article's learner blocks into intro + questions.
 * Question prompt = nearest preceding heading plus any blocks between it and the option list.
 */
function parseQuestions(blocks) {
  const listIdxs = blocks.map((b, i) => (isOptionList(b) ? i : -1)).filter((i) => i >= 0);
  const questions = [];
  let firstStart = blocks.length;

  for (const listIdx of listIdxs) {
    let start = listIdx;
    while (start > 0 && blocks[start - 1].type !== "heading") start--;
    if (start > 0) start--; // include the heading itself
    firstStart = Math.min(firstStart, start);

    questions.push({
      prompt: blocks.slice(start, listIdx).map(cleanBlock),
      options: blocks[listIdx].items.map((item) => {
        const [, letter, text] = OPTION_ITEM.exec(item);
        return { letter, text: text.trim() };
      }),
    });
  }

  const lastList = listIdxs[listIdxs.length - 1];
  return {
    intro: blocks.slice(0, firstStart).map(cleanBlock),
    questions,
    trailing: blocks.slice(lastList + 1).map(cleanBlock),
  };
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

// --- main ------------------------------------------------------------------

function generate() {
  // No timestamp on purpose: the report is committed, so it must be a pure function of the
  // inputs or every regeneration would show a spurious diff.
  const report = {
    bundles: 0,
    sections: 0,
    articles: 0,
    gradeableArticles: 0,
    quizQuestions: 0,
    freeformArticles: 0,
    sectionsWithoutVideo: [],
    sectionsWithDebriefOnly: [],
    knownAnomalies: [],
    errors: [],
    warnings: [],
  };

  if (!existsSync(BUNDLES)) {
    console.error(`No bundles at ${BUNDLES}. Run \`npm run parse\` at the repo root first.`);
    process.exit(1);
  }

  const videosByPrefix = indexVideos(report);
  const files = readdirSync(BUNDLES).filter((f) => f.endsWith(".json") && f !== "_report.json");
  report.bundles = files.length;

  const sections = [];
  const answerKey = {};

  for (const file of files) {
    const b = JSON.parse(readFileSync(join(BUNDLES, file), "utf8"));
    const prefix = prefixOf(b.sectionId);
    const vids = videosByPrefix.get(prefix) || [];
    const mains = vids.filter((v) => !v.videoId.endsWith("-debrief"));
    const debriefs = vids.filter((v) => v.videoId.endsWith("-debrief"));

    if (mains.length > 1)
      report.errors.push(`${b.sectionId}: ${mains.length} non-debrief videos share prefix ${prefix}`);
    if (vids.length === 0) report.sectionsWithoutVideo.push(b.sectionId);
    else if (mains.length === 0) report.sectionsWithDebriefOnly.push(b.sectionId);

    const articles = [];
    for (const a of b.articles) {
      report.articles++;
      const key = a.file;
      const type = a.frontmatter.article_type;
      const base = {
        key,
        title: a.frontmatter.title,
        type,
        durationMin: a.durationMin,
      };

      if (!ASSESSMENT_TYPES.has(type)) {
        articles.push({ ...base, assessment: null, blocks: a.blocks.map(cleanBlock).filter(Boolean) });
        continue;
      }

      const optionLists = a.blocks.filter(isOptionList);
      const answerParas = (a.answerKey || []).filter(isAnswerPara);
      const gradeable = optionLists.length >= 1 && optionLists.length === answerParas.length;

      if (gradeable) {
        report.gradeableArticles++;
        report.quizQuestions += optionLists.length;
        const { intro, questions, trailing } = parseQuestions(a.blocks);
        articles.push({
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
            const [, letter, explanation] = ANSWER_PARA.exec(p.text);
            return { letter, explanation: explanation.trim() };
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

      report.freeformArticles++;
      articles.push({
        ...base,
        assessment: { kind: "freeform" },
        blocks: a.blocks.map(cleanBlock).filter(Boolean),
      });
      answerKey[key] = {
        kind: "freeform",
        modelAnswer: (a.answerKey || []).map(cleanBlock).filter(Boolean),
      };
    }

    sections.push({
      id: b.sectionId,
      module: b.module,
      moduleTitle: b.moduleTitle,
      section: b.section,
      title: b.sectionTitle,
      video: mains[0] ?? null,
      debriefVideo: debriefs[0] ?? null,
      articles,
    });
  }

  sections.sort((x, y) => x.module - y.module || x.section - y.section);
  report.sections = sections.length;

  const modules = [];
  for (const s of sections) {
    let m = modules.find((x) => x.module === s.module);
    if (!m) modules.push((m = { module: s.module, title: s.moduleTitle, sectionIds: [] }));
    m.sectionIds.push(s.id);
  }

  // Sections with no requirement at all must be completable by hand (data model rule 4).
  const zeroRequirement = sections
    .filter((s) => !s.video && !s.articles.some((a) => a.assessment))
    .map((s) => s.id);

  return {
    manifest: { modules, sections, zeroRequirementSections: zeroRequirement },
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
 * the options already displayed for that same article.
 */
function verifyNoAnswerLeak(manifest, answerKey, report) {
  const manifestStr = JSON.stringify(manifest);

  if (/\*\*Answer:/.test(manifestStr))
    report.errors.push("LEAK: an `**Answer:` marker reached the manifest");

  const articles = new Map();
  for (const s of manifest.sections) for (const a of s.articles) articles.set(a.key, a);

  const textOf = (b) => (b.type === "list" ? b.items.join("\n") : b.text || b.code || "").trim();

  for (const [key, entry] of Object.entries(answerKey)) {
    const article = articles.get(key);
    if (!article) continue;

    // Everything already on screen for this article: option banks, prompts, code, prose.
    const visible = new Set();
    const collect = (blocks) => {
      for (const b of blocks || []) {
        if (b.type === "list") for (const i of b.items) visible.add(i.trim());
        visible.add(textOf(b));
      }
    };
    collect(article.blocks);
    for (const q of article.assessment?.questions || []) {
      collect(q.prompt);
      for (const o of q.options) visible.add(o.text.trim());
    }
    collect(article.assessment?.trailing);

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
    `Generated ${report.sections} sections / ${report.articles} articles ` +
      `(${report.gradeableArticles} gradeable, ${report.quizQuestions} questions, ` +
      `${report.freeformArticles} free-form).`
  );
  if (report.knownAnomalies.length)
    console.log(`Known anomalies demoted to free-form: ${report.knownAnomalies.length}`);
  for (const w of report.warnings) console.warn("  warning: " + w);
}
