---
kind: system
---

# Architecture

Last verified: 2026-08-01 against main

## System overview

This repo holds two systems around one course (5 modules / 44 sections of markdown in `course-content/`):

1. **Video pipeline** (shipped): turns course markdown into narrated whiteboard videos — parse → script authoring → Kokoro TTS → Remotion render. All 67 MP4s are rendered. The README is its orientation doc and is kept current; this page doesn't duplicate it.
2. **Course webapp** (designed, not yet built): internal Next.js app serving the course with progress tracking. Design of record: [webapp-architecture.md](webapp-architecture.md).

## Bird's eye view

```
course-content/*.md ──▶ pipeline (parse/tts/render) ──▶ output/*.mp4 ──▶ S3+CloudFront ─┐
                └──────▶ build/bundles/*.json ──▶ webapp content generator ──▶ Next.js app ◀─ learners
```

## Module map

| Path | Responsibility | Detail docs |
|---|---|---|
| `pipeline/`, `video/`, `video-scripts/` | Video generation (markdown → MP4) | README, [../script-format.md](../script-format.md), [../video-pipeline-approach.md](../video-pipeline-approach.md) |
| `course-content/` | Source course markdown — read-only input | [course-content-inventory.md](course-content-inventory.md) |
| `build/`, `output/`, `public/audio/` | Generated artifacts (gitignored) | — |
| `webapp/` (planned) | Course webapp | [webapp-architecture.md](webapp-architecture.md), [webapp-data-model.md](webapp-data-model.md) |

## Invariants and boundaries

Repo-wide hard rules live in [../../CLAUDE.md](../../CLAUDE.md). The load-bearing one across both systems: `course-content/` is the single source of truth — videos and webapp content are both regenerated from it, never hand-edited downstream.

## Key decisions

All in [../index.md](../index.md) § Decisions (`docs/adr/`).
