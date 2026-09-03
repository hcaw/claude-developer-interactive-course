# Anki spaced-repetition deck, authored from course-content and namespaced for future courses

Date: 2026-09-03
Status: Accepted

## Decision

A new `anki/` subsystem compiles a `.apkg` Anki deck from `course-content/`:

- `anki/cards/<module-slug>.json` is authored source (committed): one file per
  module, each holding an array of flashcards derived from that module's
  lessons. Authoring is an LLM pass over the markdown — five agents, one per
  module, each applying `anki/STYLE_GUIDE.md` — not a mechanical transcription
  of `pipeline/parse.mjs`'s block structure. See "Alternatives rejected" for
  why.
- `anki/generate_deck.py` is a deterministic compiler (genanki-based): it
  validates every card file, builds two shared Anki note types (Basic:
  Front/Back/Extra; Cloze: Text/Extra) and one deck per module, and writes
  `anki/dist/<course-slugs>.apkg` (gitignored, like `build/` and `output/`).
- **Deck hierarchy stops at module**: `Anthropic Courses::<Course Display
  Name>::M<N> <Module Title>`. No section-level subdecks.
- **Tags carry the finer structure**, three roots only:
  `course::<course-slug>`, `module::<module-slug>::<section-slug>` (nested,
  so `tag:module::m1-mso-foundations` alone matches every section inside it —
  Anki's `tag:parent` matches `parent::child` — while appending
  `::section-slug` narrows to one section), and
  `type::{concept|definition|pitfall|scenario}`.
- **Note types are fixed, hardcoded model IDs, shared across every course
  forever** — never derived from course data. A future course reuses the same
  Basic/Cloze note types rather than spawning new ones per course.
- **Stable per-card GUIDs**: `genanki.guid_for(course_slug, card_id)`, where
  `card_id` extends the lesson-slug convention already defined in
  `docs/wiki/course-content-inventory.md`
  (`m{module}-{section-dir-without-number}-{article-file-stem}`) with a
  sequence number. Re-running the compiler after an unrelated content edit
  updates existing notes in place instead of duplicating them, so a learner's
  review history for unchanged cards survives a reimport.
- Multiple-choice checkpoints/quizzes are deliberately **not** preserved
  1:1 — they're rewritten as open-recall cards (scenario + reasoning, no
  lettered options). See "Consequences."

## Context

The user asked for a deck built from `course-content/` that they can filter
inside Anki to study a subset, researched from reputable spaced-repetition
sources, with an explicit note that they'll likely add more Anthropic
courses later — so the deck/tag scheme had to be designed for more than one
course from the start, not retrofitted.

Four sources were actually read (not assumed from training) and drove the
card-writing rules in `anki/STYLE_GUIDE.md`:

- Piotr Woźniak, [20 rules of knowledge formulation](https://supermemo.guru/wiki/20_rules_of_knowledge_formulation) — minimum information principle, avoid enumerations, cloze deletion, references.
- Andy Matuschak, [How to write good prompts](https://andymatuschak.org/prompts/) — focused / precise / consistent / tractable / effortful.
- The official [Anki manual](https://docs.ankiweb.net/) — shorter cards, split fields, tags over deep subdecks for cross-cutting filtering.
- Gwern Branwen, [Spaced Repetition for Efficient Learning](https://gwern.net/spaced-repetition) — free recall beats multiple choice for retention.

The repo already has one shape for this kind of thing — authored content
(`course-content/`) → deterministic generator → gitignored build artifact —
used by both the video pipeline (`pipeline/parse.mjs` → `build/bundles/`) and
the webapp (`generate-content.mjs` → `src/content/*.json`). `anki/` follows
the same shape for the compile step, but the authoring step is different in
kind (see next section), so it isn't simply a third consumer of
`build/bundles/`.

## Alternatives rejected

- **Derive cards mechanically from `pipeline/parse.mjs`'s existing block
  JSON, no LLM authoring pass.** Rejected: a structural transcription would
  either reproduce checkpoints' multiple-choice shape verbatim — recognition,
  not recall, the single most load-bearing rule across all four sources — or
  require the exact same editorial judgment anyway (splitting compound
  facts, rewriting scenarios as open recall, avoiding near-duplicate phrasing
  for the same fact elsewhere in the module), just expressed as bespoke
  regex/heuristic code instead of an explicit, auditable style guide. The
  webapp's answer-key extraction is a faithful transcription of already-
  atomic quiz content; flashcard authoring is not the same kind of problem.
- **Plain-text/CSV Anki import** (`#separator`/`#deck`/`#tags` headers, no
  new dependency, fully diffable). Rejected: can't express two distinct note
  types (Basic vs Cloze) in one file, isn't a single double-click deliverable,
  and pushes the import step onto the user. `genanki`'s dependency cost
  (`pip install genanki`, MIT-licensed, the de facto standard for this) is
  small next to shipping an actual `.apkg`.
- **Hand-roll the `.apkg` SQLite schema.** Rejected: Anki's on-disk
  notetypes/templates schema is intricate and effectively documented only in
  Anki's own source; `genanki` already gets this right and is actively
  maintained.
- **Section-level Anki subdecks** (mirroring the 44 authoring sections),
  for one-click studying without learning Anki's search syntax. Rejected per
  the Anki manual's own guidance against deep subdeck fragmentation — tags
  are the documented tool for this. The nested `module::` tag gives the same
  one-line-search granularity (`tag:module::m1-mso-foundations::how-llms-behave`)
  plus a `type::` cross-cut that a deck axis alone can't express, without a
  fourth deck level that would need re-navigating for every future course.

## Consequences

- Regenerating after any `anki/cards/*.json` edit is
  `python3 anki/generate_deck.py` (requires `pip install genanki`; not added
  to any `package.json` or `requirements.txt` since nothing else in the repo
  depends on it — documented in `anki/README.md`).
- **`anki/cards/*.json` needs re-authoring, not regeneration, when a lesson's
  content meaningfully changes.** Unlike `generate-content.mjs`'s
  `--check` drift gate, there is currently no automated check that a card
  still matches its `source_file`'s current text. This is a known gap, left
  for a future pass rather than solved speculatively here.
- The compiled `.apkg` is a build artifact (gitignored under `anki/dist/`),
  not a committed file — same convention as `build/bundles/` and
  `output/*.mp4`. It's delivered to the user directly and regenerated on
  demand, not served by the webapp or hosted anywhere.
- The deck intentionally does not mirror the webapp's checkpoint quizzes
  question-for-question — it tests the reasoning behind each answer, not
  which letter was correct. Anyone expecting 1:1 parity with
  `webapp/src/content/answer-key.ts` should know this divergence is
  deliberate, not a gap to close.
- Adding a future Anthropic course means new `anki/cards/*.json` files (each
  carrying its own `course_slug`/`course_name`/`module_slug`/`module_name`)
  authored the same way, and re-running the compiler — no change to
  `generate_deck.py` itself, since deck names, tags and IDs are all derived
  from the JSON data rather than hardcoded per course.
