# Anki card authoring rules

These rules govern every card generated from `course-content/`, for this course and any
future one. They're synthesised from four sources — cite them again before changing the rules:

- Piotr Woźniak, [20 rules of knowledge formulation](https://supermemo.guru/wiki/20_rules_of_knowledge_formulation) (SuperMemo) — the minimum information principle, avoiding sets/enumerations, cloze deletion, redundancy, references.
- Andy Matuschak, [How to write good prompts: using spaced repetition to create understanding](https://andymatuschak.org/prompts/) — focused / precise / consistent / tractable / effortful; multi-lens prompts for concepts; reject binary and pattern-matchable prompts.
- Official [Anki manual](https://docs.ankiweb.net/) — shorter cards are easier to review; split fields instead of bundling; tags (not deep subdecks) are the right tool for cross-cutting filtering; `tag:parent` matches `parent::child`.
- Gwern Branwen, [Spaced Repetition for Efficient Learning](https://gwern.net/spaced-repetition) — free recall beats multiple choice for retention; rephrase, don't copy verbatim; keep cards atomic.

## The rules

1. **Minimum information principle.** One atomic fact per card. Never bundle two independent facts into one Front/Back or one cloze note.
2. **Precise and unambiguous.** A reasonable reader must land on exactly the keyed answer, not a plausible alternative. Each card is self-contained — it must make sense with the source lesson closed.
3. **Recall, not recognition.** Never put lettered options on a card. The course's checkpoints are authored as multiple-choice — rewrite them as open recall: state the scenario, ask what the right call is and why, put the answer + reasoning on the back. Never yes/no or true/false.
4. **Tractable.** A learner who studied the lesson should get it right roughly 90% of the time. Split a compound or hard fact into two+ smaller cards rather than asking one hard one.
5. **Consistent.** Don't ask the same underlying fact two different ways on two different cards — that causes retrieval interference. A second card on the same concept must take a genuinely different angle (why / when / contrast / failure mode), not a reworded duplicate.
6. **Avoid enumerations as a single card.** Never "list the 4 X's" as one Basic card. Use a Cloze note with one `{{cN::}}` per element, consistent order, so each card reveals only one element at a time.
7. **Effortful, not trivial.** Skip facts a reader could guess without having learned the material — durations, screen IDs, restated headings.
8. **Cite the source, out of band.** Every card's Extra field names the module/section/lesson it came from. That context is never part of the testable question.
9. **Applicable over incidental.** Favour a mechanism, a failure mode + fix, or a decision rule over an isolated trivial detail.
10. **Don't fabricate.** Every fact must trace to the actual lesson text. No outside knowledge, no invented numbers.
11. **Skip pure narrative/meta content.** Orientations, "why this matters" framing, and module-complete congratulations rarely hold atomic testable facts — only pull a card from them if they state something concrete and checkable.

## Note types

- **Basic** (Front / Back / Extra): question-shaped recall. Best for "what happens when / why / what's the fix / what governs X" reasoning, watch-out failure-mode-and-fix pairs, and checkpoint scenarios rewritten as open recall.
- **Cloze** (Text / Extra): best for terminology-in-context (blank the term inside its own defining sentence) and short closed lists (one `{{cN::}}` per item, consistent order). Glossary entries can go either way — Cloze on the defining sentence, or Basic with Front = term — use whichever reads more naturally for that entry.

## Content-type tag (exactly one per card)

- `type::concept` — mechanism/how-it-works facts, from Teaching lessons
- `type::definition` — term-definition pairs, from Glossary lessons or terms defined inside Teaching prose
- `type::pitfall` — a failure mode and its fix, from Watch Out lessons
- `type::scenario` — applied "what's the right call and why" reasoning, from Checkpoint/Quiz/Exercise/Cumulative lessons

## Roughly how many cards per lesson

A guide, not a quota — let actual content density decide.

| Article type | Cards |
|---|---|
| Teaching | 4–10 |
| Watch Out | 2–4 |
| Checkpoint / Quiz / Exercise / Cumulative | 1–3 per distinct question/task, focused on the "why" reasoning, never on which letter was correct |
| Glossary | 1 per term, almost always |
| Orientation / Module-complete / Recap | 0–2, only for genuinely new facts not already covered by this module's Teaching/Watch-out/Glossary cards |

## Deck and tag namespace (must stay stable as more courses are added)

- Deck path: `Anthropic Courses::<Course Display Name>::M<N> <Module Short Title>` — one subdeck per module, no deeper. Deep subdecks fragment the review queue; the Anki manual's own guidance is to keep decks shallow and put cross-cutting structure in tags instead.
- Tags, three roots only:
  - `course::<course-slug>` — stable per course, e.g. `course::claude-developer-interactive-course`
  - `module::<module-slug>::<section-slug>` — nested, e.g. `module::m1-mso-foundations::how-llms-behave`. `tag:module::m1-mso-foundations` alone matches the whole module (Anki's `tag:parent` matches `parent::child`); appending `::section-slug` narrows to one section — this is the fine-grained "study only this part" filter, since decks intentionally stop at module level.
  - `type::<concept|definition|pitfall|scenario>` (see above)

## Card JSON schema (what each module-authoring pass writes to `anki/cards/<module_slug>.json`)

```json
{
  "course_slug": "claude-developer-interactive-course",
  "module_slug": "m1-mso-foundations",
  "cards": [
    {
      "card_id": "m1-how-llms-behave-01-teaching-01",
      "note_type": "basic",
      "front": "...",
      "back": "...",
      "cloze_text": null,
      "extra": "M1 · How LLMs Behave · How LLMs behave: tokens, context, sampling, non-determinism",
      "type_tag": "concept",
      "section_slug": "how-llms-behave",
      "source_file": "course-content/module-1-mso-foundations/02-how-llms-behave/01-teaching.md"
    }
  ]
}
```

`card_id` = `{lesson_slug}-{2-digit sequence within lesson}`, where `lesson_slug` follows the
convention already established in `docs/wiki/course-content-inventory.md`:
`m{module}-{section dir without its number}-{article file stem}`. It becomes part of the note's
stable GUID, so re-running generation for a content edit keeps existing cards' review history in
Anki instead of duplicating them.

## Compiling to `.apkg`

`anki/generate_deck.py` reads every `anki/cards/*.json`, builds the deck hierarchy and the two
note types (Basic, Cloze) with genanki, and writes the `.apkg`. Card JSON is the authored source
of truth (committed); the `.apkg` is a build artifact (gitignored, regenerate with
`python3 anki/generate_deck.py`).
