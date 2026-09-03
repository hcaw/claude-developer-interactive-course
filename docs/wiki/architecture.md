---
kind: system
---

# Architecture

Last verified: 2026-08-01 against main

## System overview

This repo holds two systems around one course (5 modules / 44 sections of markdown in `course-content/`), plus a lightweight third:

1. **Video pipeline** (shipped): turns course markdown into narrated whiteboard videos — parse → script authoring → Kokoro TTS → Remotion render. All 67 MP4s are rendered. The README is its orientation doc and is kept current; this page doesn't duplicate it.
2. **Course webapp** (designed, not yet built): internal Next.js app serving the course with progress tracking. Design of record: [webapp-architecture.md](webapp-architecture.md).
3. **Anki deck** (shipped, standalone): spaced-repetition flashcards authored from course-content and compiled to a `.apkg`. Design of record: [../adr/2026-09-03-01-anki-spaced-repetition-deck.md](../adr/2026-09-03-01-anki-spaced-repetition-deck.md); card-writing rules and schema: [../../anki/STYLE_GUIDE.md](../../anki/STYLE_GUIDE.md). Not served by the webapp or hosted anywhere — a file delivered to the learner and regenerated on demand.

## Bird's eye view

```
course-content/*.md ──▶ pipeline (parse/tts/render) ──▶ output/*.mp4 ──▶ S3+CloudFront ─┐
                ├──────▶ build/bundles/*.json ──▶ webapp content generator ──▶ Next.js app ◀─ learners
                └──────▶ anki/cards/*.json (authored) ──▶ generate_deck.py ──▶ anki/dist/*.apkg ◀─ learner (Anki)
```

## Module map

| Path | Responsibility | Detail docs |
|---|---|---|
| `pipeline/`, `video/`, `video-scripts/` | Video generation (markdown → MP4) | README, [../script-format.md](../script-format.md), [../video-pipeline-approach.md](../video-pipeline-approach.md) |
| `course-content/` | Source course markdown — read-only input | [course-content-inventory.md](course-content-inventory.md) |
| `build/`, `output/`, `public/audio/` | Generated artifacts (gitignored) | — |
| `webapp/` (planned) | Course webapp | [webapp-architecture.md](webapp-architecture.md), [webapp-data-model.md](webapp-data-model.md) |
| `anki/` | Spaced-repetition deck (cards authored from course-content, compiled to `.apkg`) | [../adr/2026-09-03-01-anki-spaced-repetition-deck.md](../adr/2026-09-03-01-anki-spaced-repetition-deck.md) |

## Invariants and boundaries

Repo-wide hard rules live in [../../CLAUDE.md](../../CLAUDE.md). The load-bearing one across all three: `course-content/` is the single source of truth. Videos and webapp content are mechanically regenerated from it on every edit. `anki/cards/*.json` is different in kind — authored *from* it by an LLM pass applying `anki/STYLE_GUIDE.md`, not a structural transcription — and needs re-authoring, not regeneration, when a lesson's content meaningfully changes (adr/2026-09-03-01).

## Key decisions

All in [../index.md](../index.md) § Decisions (`docs/adr/`).
