# Make every checkable checkpoint an interactive graded quiz

Date: 2026-08-04
Status: Accepted
Extends: [2026-08-01-04](2026-08-01-04-course-content-static-at-build.md) (answer keys stay
server-only) and [2026-08-04-11](2026-08-04-11-lesson-as-the-unit.md) (the lesson is the unit).

## Decision

Every checkpoint whose answer is determinate is a **graded quiz**: interactive options, one
server-graded submission, pass-to-complete at the existing `ceil(0.7·n)` threshold. That takes the
course from 8 graded lessons / 18 questions to **24 graded lessons / 68 questions**. The 13
checkpoints that are genuinely free-text (write code or prose, self-assess) get a **SelfAssess**
surface: a monospace answer box whose draft persists in `localStorage`, and a reveal that becomes
"Compare with model answer" with the learner's text kept on screen. Reveal-equals-complete is
unchanged for those.

**One quiz shape covers every checkable pattern.** Matching is authored as one single-select
question per row, all sharing the same option bank; fill-blank is a single-select per blank;
"select two pieces" is one multi-select question whose answer is a letter set. No new assessment
kind, no new route, no schema migration.

## Context

29 of the 37 assessment lessons rendered as inert prose plus a "Show model answer" button. The
owner's reported example (m3-02's checkpoint) said "Select two pieces" over a plain bullet list —
and rendered its `Piece | Verdict | Why` answer table **before any reveal**, because the answer
split in `pipeline/parse.mjs` only recognizes key *headings* and the table sat under "Part 1: …".
A survey found the same class of bug elsewhere: 4 lessons leaked answers into learner-visible
blocks, and 4 lessons had lost their question stems *into* the answer key (one page rendered a
single sentence and a reveal button). Meanwhile 16 of the 29 already had machine-checkable answers
sitting in `answer-key.json` — "Answer: Pieces C and D", per-row answer tables — that nothing used.

## The authoring convention (canonical templates)

- Question heading (`### Scenario 1 · …`, `### Blank 1 · …`, `### Part 1 · …`) — must NOT begin
  with a word matching parse.mjs's `KEY_HEADING_RE` (why/answer/model answer/solution/…).
- Option list `- **A.** …` (uppercase A–F only), immediately followed by
  `**Answer: B** — rationale` (or `**Answer: C, D** — …` for a set). Grading is positional;
  the generator hard-errors if an answer paragraph is not adjacent to its list in source order.
- Per-question rationale = the Answer paragraph's tail. Lesson-level synthesis under `### Why` /
  `### Other feedback branches` → server-side debrief, released after an attempt.
- Matching rows repeat the shared bank verbatim per question; bank order is shuffled relative to
  the row order so answers don't run A, B, C….

## Encoding

An answer slot is one string per question: `"B"`, or `"C,D"` for multi — sorted, deduped,
comma-joined. The API payload stays `{ lessonKey, answers: string[] }` and
`quiz_attempts.answers` stays `jsonb string[]`; a multi answer is one slot, e.g. `["C,D","B"]`.
The route rejects non-canonical slots. Grading is **set equality, all-or-nothing per question** —
partial-letter credit would make `score/total` incoherent across mixed lessons. Pure helpers live
in `src/lib/quiz-grading.ts` because `answer-key.ts` imports `server-only`, which cannot load
under the node:test runner.

## Alternatives rejected

- **Interactive but self-checked** (pick locally, compare after reveal) — no pipeline work, but
  answers stay unenforced and the leaks would have needed separate patching anyway.
- **Real drag-and-drop** for the "drag the card" checkpoints — a bespoke a11y-heavy widget with no
  library in the repo. Option cards per row are the same interaction language as the existing
  quizzes and are keyboard/screen-reader accessible for free. Sources reworded "drag" → "select".
- **A new `matching` assessment kind** — every checkable pattern reduces to single/multi-select
  questions, so a new kind would triple the component/route/progress surface for zero capability.
- **Server-persisted free-text answers** — nobody grades them; persisting prose adds a write path
  and a privacy surface for no completion value. `localStorage` drafts are deliberate.

## Consequences

- `QuizQuestion` gains `multi: boolean` — **never the count**: one checkpoint's trap is that all
  four options are correct, and shipping "pick k" would spoil it. The UI hint is only "Select all
  that apply". `QuizAnswer.letter` became `letters: string[]`.
- **Trailing blocks render only after grading** (or on revisit once passed) — one lesson's
  trailing was a verdict table that eliminated two of three options pre-submit.
- **The generator now enforces content integrity** (STRICT_GUARDS): answer letters must exist in
  the paired option list; answer paragraphs must be adjacent to their list (`srcIdx` stamped in
  parse.mjs — a mis-pairing would silently grade question 1 against answer 2); no learner block
  may fall between questions and be dropped; no learner-visible table cell may read
  Correct/Wrong; a free-form lesson with fewer than 2 learner blocks fails (the lost-stems class).
  `KNOWN_ANOMALIES` is empty — the two m2 checkpoints it excused are now well-formed and graded.
- **Non-required (debrief) videos on assessment lessons render below the task** — a walkthrough
  above the exercise it spoils was an invitation to watch first.
- `ui/textarea.tsx` is a new primitive not in the Stackdrop kit (token-only, zero radius, mono) —
  the recorded deviation this ADR covers, per `webapp/AGENTS.md`.
- Accepted consequences: 2–3-question checkpoints require a perfect score (`ceil(0.7·n)`;
  retakes are unlimited and append-only); `multi: true` discloses "more than one is correct";
  shared-bank matching makes the last row partially inferable; and the 67 rendered narrations
  still say "drag" in a few places while the screen says "select" — re-rendering audio for verb
  agreement was not worth it.
- Converted lessons flipped freeform → quiz with **zero data migration**: requirements derive
  from `assessment.kind`, a stale `manual_completions` row is simply never consulted, and the only
  pre-existing manual completion (m2-05, still free-text) kept its meaning.
