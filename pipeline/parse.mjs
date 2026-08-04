// Stage 1: parse course-content/**/*.md into structured section bundles.
// Usage: node pipeline/parse.mjs [--section <section-id>]
// Output: build/bundles/<section-id>.json + build/bundles/_report.json

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";

const ROOT = new URL("..", import.meta.url).pathname;
const CONTENT_DIR = join(ROOT, "course-content");
const OUT_DIR = join(ROOT, "build", "bundles");

const REQUIRED_FRONTMATTER = [
  "module",
  "module_title",
  "section",
  "section_title",
  "article",
  "article_type",
  "title",
  "duration",
  "screen_id",
];

// The five per-module legal disclaimers must never reach narration.
const DISCLAIMER_RE = /informational purposes|legal advice|no warranty/i;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

// --- lightweight block parser ---------------------------------------------

function parseBlocks(body) {
  const lines = body.split("\n");
  const blocks = [];
  let i = 0;

  const flushPara = (buf) => {
    const text = buf.join(" ").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ type: "paragraph", text });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, "").trim() || "text";
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; // closing fence
      blocks.push({ type: "code", lang, code: buf.join("\n") });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    if (/^>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      const text = buf.join("\n").trim();
      const label = /^\*\*(.+?)\*\*/.exec(text)?.[1] ?? null;
      blocks.push({
        type: "callout",
        label,
        text,
        disclaimer: DISCLAIMER_RE.test(text),
      });
      continue;
    }

    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cells = lines[i]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(#|```|>|\||\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    flushPara(buf);
  }

  return blocks;
}

// --- answer-key split for assessment articles ------------------------------

const ASSESSMENT_TYPES = new Set(["Checkpoint", "Quiz", "Exercise", "Cumulative"]);
const KEY_HEADING_RE = /^(why|other feedback branches|answer|model answer|solution|corrected version|debrief)/i;
const ANSWER_LINE_RE = /^\*\*Answer:\s*[^*]+\*\*/;

function splitAnswerKey(blocks) {
  const learner = [];
  const answerKey = [];
  let inKeySection = false;
  let keySectionLevel = 0;

  for (const block of blocks) {
    if (block.type === "heading") {
      if (KEY_HEADING_RE.test(block.text)) {
        inKeySection = true;
        keySectionLevel = block.level;
        answerKey.push(block);
        continue;
      }
      if (inKeySection && block.level <= keySectionLevel) inKeySection = false;
    }
    if (inKeySection) {
      answerKey.push(block);
      continue;
    }
    if (block.type === "paragraph" && ANSWER_LINE_RE.test(block.text)) {
      answerKey.push(block);
      continue;
    }
    if (block.type === "list") {
      const keyItems = block.items.filter((it) => ANSWER_LINE_RE.test(it));
      if (keyItems.length) {
        answerKey.push({ type: "list", items: keyItems, srcIdx: block.srcIdx });
        const rest = block.items.filter((it) => !ANSWER_LINE_RE.test(it));
        if (rest.length) learner.push({ type: "list", items: rest, srcIdx: block.srcIdx });
        continue;
      }
    }
    learner.push(block);
  }

  return { learner, answerKey };
}

// --- main ------------------------------------------------------------------

const files = walk(CONTENT_DIR);
const sections = new Map();
const report = { files: files.length, sections: 0, errors: [], warnings: [] };

for (const file of files) {
  const rel = relative(CONTENT_DIR, file);
  const raw = readFileSync(file, "utf8");
  let fm, body;
  try {
    ({ data: fm, content: body } = matter(raw));
  } catch (e) {
    report.errors.push(`${rel}: frontmatter parse failed: ${e.message}`);
    continue;
  }

  for (const key of REQUIRED_FRONTMATTER) {
    if (fm[key] === undefined) report.errors.push(`${rel}: missing frontmatter key "${key}"`);
  }

  const [moduleDir, sectionDir] = rel.split("/");
  const sectionId = `m${fm.module}-${sectionDir}`;
  const blocks = parseBlocks(body.trim());
  // Source order, stamped before the answer-key split so the generator can verify that each
  // answer paragraph really sits next to its option list (positional grading depends on it).
  // Never reaches the manifest: the generator's cleanBlock whitelists fields.
  blocks.forEach((b, i) => (b.srcIdx = i));

  const article = {
    file: join("course-content", rel),
    frontmatter: fm,
    durationMin: parseInt(String(fm.duration), 10) || null,
    blocks,
  };

  if (ASSESSMENT_TYPES.has(fm.article_type)) {
    const { learner, answerKey } = splitAnswerKey(blocks);
    article.blocks = learner;
    article.answerKey = answerKey;
    if (answerKey.length === 0)
      report.warnings.push(`${rel}: ${fm.article_type} article but no answer-key content detected`);
  }

  if (!sections.has(sectionId)) {
    sections.set(sectionId, {
      sectionId,
      module: fm.module,
      moduleTitle: fm.module_title,
      moduleDir,
      section: fm.section,
      sectionTitle: fm.section_title,
      articles: [],
    });
  }
  sections.get(sectionId).articles.push(article);
}

mkdirSync(OUT_DIR, { recursive: true });

const only = process.argv.includes("--section")
  ? process.argv[process.argv.indexOf("--section") + 1]
  : null;

for (const [id, bundle] of sections) {
  if (only && id !== only) continue;
  bundle.articles.sort((a, b) => a.frontmatter.article - b.frontmatter.article);
  writeFileSync(join(OUT_DIR, `${id}.json`), JSON.stringify(bundle, null, 2));
}
report.sections = sections.size;

writeFileSync(join(OUT_DIR, "_report.json"), JSON.stringify(report, null, 2));

console.log(`Parsed ${report.files} files into ${report.sections} section bundles.`);
if (report.errors.length) {
  console.error(`ERRORS (${report.errors.length}):`);
  for (const e of report.errors) console.error("  " + e);
  process.exit(1);
}
if (report.warnings.length) {
  console.warn(`Warnings (${report.warnings.length}):`);
  for (const w of report.warnings) console.warn("  " + w);
}
