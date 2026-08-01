---
kind: system
---

# Course Content Inventory

Last verified: 2026-08-01 against main (all counts re-verified by script against `build/bundles`, `output/`, `video-scripts/`)

Ground truth about the course content that the webapp's content generator and completion logic depend on. Source of truth is this repo: `course-content/` markdown → `pipeline/parse.mjs` → `build/bundles/<section-id>.json` (gitignored; regenerate with `npm run parse`).

## Shape

- **44 sections** across 5 modules: **6 / 11 / 9 / 9 / 9** (m1–m5). Section ids: `m<module>-<NN>-<slug>`.
- **108 articles** total. Bundle shape per section: `{ sectionId, module, moduleTitle, moduleDir, section, sectionTitle, articles: [{ file, frontmatter, durationMin, blocks, answerKey }] }`.
- **Block types are a closed set of 6**: `heading{level,text}`, `paragraph{text}`, `list{items}`, `callout{label,text,disclaimer}`, `table{rows}`, `code{lang,code}` with langs `text|json|yaml|python|markdown`. Inline markdown in text is limited to `**bold**`, `` `code` ``, `*italic*`, `[link](url)` — no images, no blockquotes. A small hand-rolled inline renderer suffices; no markdown library needed.

## Videos

- **67 MP4s** in `output/module-N/` (590 MB total, files 3.0–18.1 MB, 1080p) = **38 main + 29 debrief** (`*-debrief.mp4`). Every basename has a matching `video-scripts/<basename>/script.json` carrying the canonical `title`/`subtitle`.
- **Join rule — never join on full basename.** Two videos have truncated names vs their section: `m2-10-multimodal-and-batch.mp4` (section `…-batch-ingestion`) and `m3-02-permission-modes.mp4` (section `…-modes-and-human-gates`). The reliable join is the **`m{module}-{NN}` prefix**; a `-debrief` suffix classifies debriefs. Verified: every video prefix-matches exactly one section.
- **Sections with no video**: `m3-09-module-complete`, `m4-09-module-complete` (completion needs a manual "Mark complete" — see [webapp-data-model.md](webapp-data-model.md)).
- **Sections whose only video is a debrief**: `m2-09-cumulative-debug-task`, `m3-07-cumulative-integration-task`, `m4-07-cumulative-task`, `m5-08-cumulative-task`. Debriefs are never required for completion.

## Assessments

- **37 assessment articles** (frontmatter `article_type` ∈ Checkpoint, Quiz, Exercise, Cumulative). `parse.mjs` splits answers out of learner blocks into `article.answerKey`.
- **8 are gradeable MCQs** (the only auto-graded surface, 18 questions total): m1-06 Quiz (4q) + m1-06 Exercise (4q), m3-04 (2q), m3-06 (1q), m4-03 (1q), m4-04 (3q), m5-04 (2q), m5-06 (1q).
- **29 are free-form** (fix-the-prompt, assemble-config, all cumulative tasks): rendered read-only with a server-side "reveal model answer" flow; the reveal marks them reviewed.

### Classification rule (the generator MUST implement exactly this)

- An *option list* is a `list` block where **every** item matches `/^\*\*[A-F][.)]\*\*/`.
- An *answer paragraph* is an answerKey `paragraph` matching `/^\*\*Answer:\s*([A-F])\*\*/` (ordered, paired positionally with option lists).
- **Gradeable iff ≥1 option list AND count(option lists) == count(answer paragraphs).** Question prompt = nearest preceding h3 (`Question N` / `Scenario N`) plus intervening blocks.
- Leftover answerKey blocks after the Answer paragraphs ("Why", "Other feedback branches") are post-submit debrief content — server-side only until submission.

### Known anomalies (whitelisted; generator fails on any NEW one)

`m2-04` and `m2-06` checkpoints contain a *second* option-shaped list in learner blocks that is per-option feedback and **leaks the answer**. The count-match rule correctly demotes them to free-form. The generator whitelists exactly these two article keys in `content-report.json` and must exit non-zero on any new anomaly so content edits can't silently mis-classify. ([adr/2026-08-01-04](../adr/2026-08-01-04-course-content-static-at-build.md))
