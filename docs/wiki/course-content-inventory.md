---
kind: system
---

# Course Content Inventory

Last verified: 2026-08-04 against main (all counts re-verified by script against `build/bundles`, `output/`, `video-scripts/`)

Ground truth about the course content that the webapp's content generator and completion logic depend on. Source of truth is this repo: `course-content/` markdown → `pipeline/parse.mjs` → `build/bundles/<section-id>.json` (gitignored; regenerate with `npm run parse`).

## Shape

- **108 lessons** across 5 modules: **9 / 29 / 22 / 23 / 25** (m1–m5). One authored article = one lesson = one page ([adr/2026-08-04-11](../adr/2026-08-04-11-lesson-as-the-unit.md)).
- The **section** is now only an authoring directory and a heading on the module page — 44 of them, **6 / 11 / 9 / 9 / 9**. It is not a route and not a unit of completion.
- **Lesson key** = the source file path; this is what the activity tables store, and it did not change when sections were retired. **Lesson slug** = `m{module}-{section dir without its number}-{article file stem}`, e.g. `m3-permission-modes-and-human-gates-02-watch-out`. The article's number stays in the slug because it is what makes it unique — m4-04 has two `teaching` and two `checkpoint` articles. The generator asserts uniqueness.
- Bundle shape per section (the pipeline still groups by directory): `{ sectionId, module, moduleTitle, moduleDir, section, sectionTitle, articles: [{ file, frontmatter, durationMin, blocks, answerKey }] }`.
- **Every article opens with a `# Title` identical to its frontmatter `title`.** The generator strips that heading (so the page prints the title once) and **fails** if a leading H1 does not match — keeping the two in step is what makes the strip safe.
- **Block types are a closed set of 6**: `heading{level,text}`, `paragraph{text}`, `list{items}`, `callout{label,text,disclaimer}`, `table{rows}`, `code{lang,code}` with langs `text|json|yaml|python|markdown`. Inline markdown in text is limited to `**bold**`, `` `code` ``, `*italic*`, `[link](url)` — no images, no blockquotes. A small hand-rolled inline renderer suffices; no markdown library needed.

## Videos

- **67 MP4s** in `output/module-N/` (590 MB total, files 3.0–18.1 MB, 1080p) = **38 main + 29 debrief** (`*-debrief.mp4`). Every basename has a matching `video-scripts/<basename>/script.json` carrying the canonical `title`/`subtitle`.
- **Join rule — `script.json`'s `covers` array, never a filename prefix.** `covers` lists the repo-relative paths of the lessons a video narrates. A main video usually narrates a teaching lesson **and** the watch-out story after it; a `-debrief` narrates the checkpoint. The old `m{module}-{NN}` prefix rule could not express that, which is why 25 debriefs were unreachable before [adr/2026-08-04-11](../adr/2026-08-04-11-lesson-as-the-unit.md). It also removes the truncated-basename hazard (`m2-10-multimodal-and-batch.mp4`, `m3-02-permission-modes.mp4`) entirely.
- The **first lesson in `covers`** (in course order) renders the player; the rest show a pointer to it. The generator fails on an unresolved `covers` path, an mp4 with no script, a script with no mp4, or a lesson claimed by two videos.
- **Coverage: 104 of 108 lessons are narrated.** The four exceptions are the module glossaries (`m2-11`, `m3-08`, `m4-08`, `m5-09` `02-glossary.md`) — the only genuinely silent content in the course.
- **Debriefs are never required for completion** — gating a hands-on exercise on watching its walkthrough would invert the exercise.
- **Known drift**: 9 narrations still say "screen" where the written course now says "lesson"/"page". Fixing them means re-running TTS and re-rendering those videos; accepted as cosmetic.

## Assessments

- **37 assessment lessons** (frontmatter `article_type` ∈ Checkpoint, Quiz, Exercise, Cumulative). `parse.mjs` splits answers out of learner blocks into `article.answerKey`.
- **33 lessons have no requirement at all** — a watch-out page pointing at another lesson's video, a glossary, a second-stage page. They complete when read (`viewOnlyLessonKeys`, the closed whitelist `/api/progress/complete` accepts).
- **24 are graded quizzes, 68 questions total** (adr/2026-08-04-12) — the census with per-lesson question counts is pinned in `webapp/src/lib/progress.manifest.test.ts` (`GRADEABLE`). Matching/fill-blank checkpoints are authored as rows of single-selects sharing a bank; two questions are multi-select (letter-set answers like `**Answer: C, D**`).
- **13 are free-form** (write-the-fix and all cumulative tasks): a SelfAssess answer box (draft in localStorage) plus "Compare with model answer"; the reveal marks them reviewed and completes the lesson.

### Classification rule (the generator MUST implement exactly this)

- An *option list* is a `list` block where **every** item matches `/^\*\*[A-F][.)]\*\*/`.
- An *answer paragraph* is an answerKey `paragraph` matching `/^\*\*Answer:\s*([A-F](?:,\s*[A-F])*)\*\*/` — one letter, or a comma-separated set for multi-select. Ordered, paired positionally with option lists.
- **Gradeable iff ≥1 option list AND count(option lists) == count(answer paragraphs).** Question prompt = nearest preceding heading (`Question N` / `Scenario N` / `Blank N` / …) plus intervening blocks. Question headings must never start with a `KEY_HEADING_RE` word (why/answer/model answer/solution/corrected version/debrief), or the whole question is swept into the answer key.
- The `**Answer:**` paragraph sits immediately after its option list — the generator errors when source order would mis-pair positional grading.
- Leftover answerKey blocks after the Answer paragraphs ("Why", "Other feedback branches") are post-submit debrief content — server-side only until submission.

### Content guards (generator exits non-zero; `KNOWN_ANOMALIES` is empty — keep it that way)

Since adr/2026-08-04-12 every checkpoint is normalized and the generator enforces it: answer letters must exist in the paired option list; answer paragraphs must be adjacent to their list in source order; no learner block may fall between questions (historically dropped silently); no learner-visible table cell may read Correct/Wrong; a free-form lesson with fewer than 2 learner blocks fails (its task content is trapped in the answer key). The count-mismatch anomaly mechanism from adr/2026-08-01-04 still exists, with an empty whitelist.
