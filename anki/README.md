# Anki deck

Spaced-repetition flashcards generated from `course-content/`. Design rationale:
[`docs/adr/2026-09-03-01-anki-spaced-repetition-deck.md`](../docs/adr/2026-09-03-01-anki-spaced-repetition-deck.md).
Card-writing rules and the JSON schema: [`STYLE_GUIDE.md`](STYLE_GUIDE.md).

## Layout

- `cards/<module-slug>.json` — authored cards, one file per module (committed, source of truth)
- `generate_deck.py` — deterministic compiler: validates the card JSON and writes the `.apkg` (genanki-based)
- `dist/` — build output (gitignored)

## Regenerating the deck

```bash
pip install -r anki/requirements.txt
python3 anki/generate_deck.py
```

Writes `anki/dist/<course-slugs>.apkg`. Re-run this after editing any `anki/cards/*.json`
file. It will not catch a card that's gone stale because the *source lesson* changed
underneath it — that needs a human (or an agent) to re-read the lesson and update the card;
see the ADR's "Consequences" for why that's not automated yet.

## Importing into Anki

Double-click the `.apkg`, or in Anki: File → Import.

## Studying a subset

The deck stops at module level (`Anthropic Courses::Claude Developer Interactive Course::M1 ...`),
so clicking a module in Anki's deck list already studies just that module. For anything finer —
one section, or one content type across the whole course — use tags, either in the Browse search
bar or via **Custom Study → Study by card state or tag**:

| Want to study... | Search |
|---|---|
| Everything from this course | `tag:course::claude-developer-interactive-course` |
| Just Module 3 | `tag:module::m3-claude-code-mcp-and-integration` |
| Just one section | `tag:module::m1-mso-foundations::how-llms-behave` |
| Only glossary/definition terms, whole course | `tag:course::claude-developer-interactive-course tag:type::definition` |
| Only pitfalls (Watch Out cards) in Module 4 | `tag:module::m4-production-engineering-evals-and-security tag:type::pitfall` |
| Only applied-reasoning scenario cards | `tag:type::scenario` |

`tag:module::m1-mso-foundations` alone matches every card in that module (Anki's `tag:parent`
also matches `parent::child`); appending `::section-slug` narrows it to one section. Combine
any of these with `or` / parentheses per Anki's search syntax
(https://docs.ankiweb.net/searching.html).

## Adding a future course

Drop new `anki/cards/<module-slug>.json` files, each with its own `course_slug` / `course_name`
/ `module_slug` / `module_name` (see `STYLE_GUIDE.md` for the schema) and cards authored per the
same rules, then re-run `generate_deck.py`. No code change needed — deck names, tags, and IDs are
all derived from the JSON, and the two note types (Basic, Cloze) are shared across every course.
