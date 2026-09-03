#!/usr/bin/env python3
"""Compile anki/cards/*.json into anki/dist/<course-slugs>.apkg.

Card JSON is the authored source of truth (committed, see STYLE_GUIDE.md for
the schema and the rules the cards follow). This script is a deterministic
build step — the same role `npm run parse` plays for the video pipeline: it
makes no editorial judgment calls, only structural validation and assembly.

Usage:
    python3 anki/generate_deck.py

Adding a future course: drop new anki/cards/<module-slug>.json files, each
carrying its own course_slug/course_name/module_slug/module_name, and
re-run. No code change is needed here — deck names, tags and IDs are all
derived from the JSON data, not hardcoded per course.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import sys
from pathlib import Path

import genanki

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CARDS_DIR = HERE / "cards"
DIST_DIR = HERE / "dist"

DECK_ROOT = "Anthropic Courses"

# Fixed once, hardcoded forever (genanki's own convention). These identify
# the note *types* (Basic/Cloze), shared across every course — never derive
# them from course data, or re-running the generator would orphan reviewers'
# existing scheduling history for every note already in their collection.
BASIC_MODEL_ID = 1_607_392_319
CLOZE_MODEL_ID = 1_942_838_105

ALLOWED_NOTE_TYPES = {"basic", "cloze"}
ALLOWED_TYPE_TAGS = {"concept", "definition", "pitfall", "scenario"}
CLOZE_RE = re.compile(r"\{\{c\d+::")

CSS = """
.card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 20px;
  text-align: left;
  color: #1a1a1a;
  background-color: #fbfaf7;
  line-height: 1.5;
  padding: 20px;
  max-width: 640px;
  margin: 0 auto;
}
strong { color: #b34700; }
code {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}
hr#answer {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.15);
  margin: 1em 0;
}
.cloze { font-weight: 600; color: #0b5fa5; }
.extra {
  margin-top: 1.2em;
  padding-top: 0.6em;
  border-top: 1px dashed rgba(0, 0, 0, 0.15);
  font-size: 0.75em;
  color: #6b6b6b;
}
.card.night_mode, .night_mode .card { color: #e8e6e1; background-color: #2f2f31; }
@media (prefers-color-scheme: dark) {
  .card { color: #e8e6e1; background-color: #2f2f31; }
  code { background: rgba(255, 255, 255, 0.12); }
  hr#answer { border-top-color: rgba(255, 255, 255, 0.2); }
  .extra { border-top-color: rgba(255, 255, 255, 0.2); color: #a7a7a7; }
}
"""

BASIC_MODEL = genanki.Model(
    BASIC_MODEL_ID,
    "Claude Course Basic",
    fields=[{"name": "Front"}, {"name": "Back"}, {"name": "Extra"}],
    templates=[
        {
            "name": "Card 1",
            "qfmt": '<div class="front">{{Front}}</div>',
            "afmt": (
                '{{FrontSide}}<hr id="answer"><div class="back">{{Back}}</div>'
                "{{#Extra}}<div class=\"extra\">{{Extra}}</div>{{/Extra}}"
            ),
        }
    ],
    css=CSS,
)

CLOZE_MODEL = genanki.Model(
    CLOZE_MODEL_ID,
    "Claude Course Cloze",
    fields=[{"name": "Text"}, {"name": "Extra"}],
    templates=[
        {
            "name": "Cloze",
            "qfmt": '<div class="front">{{cloze:Text}}</div>',
            "afmt": (
                '<div class="front">{{cloze:Text}}</div>'
                "{{#Extra}}<div class=\"extra\">{{Extra}}</div>{{/Extra}}"
            ),
        }
    ],
    css=CSS,
    model_type=genanki.Model.CLOZE,
)


def stable_id(namespace: str, key: str) -> int:
    """Deterministic id in genanki's recommended [2**30, 2**31) range, so
    reruns are idempotent instead of picking a fresh random id every time."""
    digest = hashlib.sha256(f"{namespace}::{key}".encode("utf-8")).hexdigest()
    return (1 << 30) + (int(digest[:8], 16) % (1 << 30))


def md_to_html(text: str) -> str:
    """Escape raw HTML from source content, then apply the same limited
    markdown subset course-content itself uses (**bold**, `code`) — see
    docs/wiki/course-content-inventory.md's block-type note. Cloze markup
    ({{c1::...}}) is untouched: html.escape only touches & < >, and the
    bold/code regexes only match * and ` runs."""
    escaped = html.escape(text, quote=False)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"`(.+?)`", r"<code>\1</code>", escaped)
    return escaped.replace("\n\n", "<br><br>").replace("\n", "<br>")


def fail(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def load_card_files() -> list[dict]:
    files = sorted(CARDS_DIR.glob("*.json"))
    if not files:
        fail(f"no card files found in {CARDS_DIR}")
    modules = []
    for f in files:
        try:
            data = json.loads(f.read_text())
        except json.JSONDecodeError as e:
            fail(f"{f}: invalid JSON ({e})")
        for key in ("course_slug", "course_name", "module_slug", "module_name", "cards"):
            if key not in data:
                fail(f"{f}: missing top-level key '{key}'")
        data["_source_file"] = str(f)
        modules.append(data)
    return modules


def validate_card(card: dict, file: str, seen_ids: set) -> None:
    required = ("card_id", "note_type", "extra", "type_tag", "section_slug", "source_file")
    for key in required:
        if not card.get(key):
            fail(f"{file}: card missing required field '{key}': {card}")

    card_id = card["card_id"]
    if card_id in seen_ids:
        fail(f"{file}: duplicate card_id '{card_id}' (must be globally unique)")
    seen_ids.add(card_id)

    if card["note_type"] not in ALLOWED_NOTE_TYPES:
        fail(f"{file}: card {card_id} has invalid note_type '{card['note_type']}'")
    if card["type_tag"] not in ALLOWED_TYPE_TAGS:
        fail(f"{file}: card {card_id} has invalid type_tag '{card['type_tag']}'")

    src = ROOT / card["source_file"]
    if not src.is_file():
        fail(f"{file}: card {card_id} source_file does not exist: {card['source_file']}")

    if card["note_type"] == "basic":
        if not card.get("front") or not card.get("back"):
            fail(f"{file}: basic card {card_id} missing front/back")
        if card.get("cloze_text"):
            fail(f"{file}: basic card {card_id} has non-null cloze_text")
    else:
        if not card.get("cloze_text"):
            fail(f"{file}: cloze card {card_id} missing cloze_text")
        if not CLOZE_RE.search(card["cloze_text"]):
            fail(f"{file}: cloze card {card_id} has no {{{{cN::}}}} deletion")
        if card.get("front") or card.get("back"):
            fail(f"{file}: cloze card {card_id} has non-null front/back")


def build_note(course_slug: str, module_slug: str, card: dict) -> genanki.Note:
    tags = [
        f"course::{course_slug}",
        f"module::{module_slug}::{card['section_slug']}",
        f"type::{card['type_tag']}",
    ]
    guid = genanki.guid_for(course_slug, card["card_id"])
    extra = md_to_html(card["extra"])
    if card["note_type"] == "basic":
        fields = [md_to_html(card["front"]), md_to_html(card["back"]), extra]
        model = BASIC_MODEL
    else:
        fields = [md_to_html(card["cloze_text"]), extra]
        model = CLOZE_MODEL
    return genanki.Note(model=model, fields=fields, tags=tags, guid=guid)


def main() -> None:
    modules = load_card_files()

    seen_ids: set = set()
    decks: dict = {}
    total = 0
    by_type: dict = {}
    by_module: dict = {}

    for mod in modules:
        deck_name = f"{DECK_ROOT}::{mod['course_name']}::{mod['module_name']}"
        deck = decks.setdefault(deck_name, genanki.Deck(stable_id("deck", deck_name), deck_name))
        for card in mod["cards"]:
            validate_card(card, mod["_source_file"], seen_ids)
            note = build_note(mod["course_slug"], mod["module_slug"], card)
            deck.add_note(note)
            total += 1
            by_type[card["type_tag"]] = by_type.get(card["type_tag"], 0) + 1
            by_module[deck_name] = by_module.get(deck_name, 0) + 1

    DIST_DIR.mkdir(exist_ok=True)
    course_slugs = sorted({m["course_slug"] for m in modules})
    out_path = DIST_DIR / (("-".join(course_slugs)) + ".apkg")
    genanki.Package(list(decks.values())).write_to_file(str(out_path))

    print(f"Wrote {out_path} ({total} cards, {len(decks)} decks, {len(modules)} module files)")
    for deck_name, count in sorted(by_module.items()):
        print(f"  {deck_name}: {count} cards")
    print("By type:", ", ".join(f"{k}={v}" for k, v in sorted(by_type.items())))


if __name__ == "__main__":
    main()
