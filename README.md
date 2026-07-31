# Claude Developer Interactive Course

Turns the text-only Claude Developer course (`course-content/`, 108 markdown articles) into narrated whiteboard-style videos — fully generated, zero manual editing. First POC video is rendered and verified; batch generation of the remaining 43 sections is the next phase, followed by an interactive course web app.

**Start here for context. Deep docs:** [docs/video-pipeline-approach.md](docs/video-pipeline-approach.md) (research + decisions) · [docs/script-format.md](docs/script-format.md) (script.json schema reference). Claude Code users: the `whiteboard-video-scripts` skill covers script authoring; `whiteboard-course-videos` covers this whole workflow.

## Prerequisites

- Node 22+, Docker. No global ffmpeg needed (Remotion bundles one: `npx remotion ffmpeg`).
- Kokoro TTS server (local, free):
  ```sh
  docker run -d --name kokoro-tts -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
  curl -s localhost:8880/health   # {"status":"healthy"} — cold start ~20s
  ```

## Pipeline (per section)

```
course-content/**/*.md
  → npm run parse                          # all 108 files → build/bundles/<section-id>.json
  → author video-scripts/<section-id>/script.json   # Claude writes narration + scene spec (see docs/script-format.md)
  → node pipeline/tts.mjs <section-id>     # Kokoro → public/audio/<section-id>/*.wav + timing.json (word timestamps)
  → register section in video/src/Root.tsx # import script.json + timing.json, add to `sections`
  → npx remotion render video/src/index.ts <section-id> output/<module>/<section-id>.mp4
```

Section ids follow `m<module>-<section-dir>`, e.g. `m1-02-how-llms-behave`.

## How sync works (the core idea)

Every scene element in `script.json` has a `cue` — a word or phrase from that beat's narration. Kokoro returns word-level timestamps with the audio; the Remotion composition ([video/src/WhiteboardVideo.tsx](video/src/WhiteboardVideo.tsx)) starts drawing each element the moment its cue word is spoken, and the caption bar highlights the active word. Everything is data-driven: one generic composition renders any script.json; nobody writes per-video code.

## Repo map

| Path | What |
|---|---|
| `course-content/` | Source course markdown (5 modules, 44 sections). Read-only input. |
| `pipeline/parse.mjs` | Stage 1: markdown → structured bundles; splits quiz answer keys from learner content. |
| `pipeline/tts.mjs` | Stage 3: script.json → WAVs + `timing.json` via Kokoro `/dev/captioned_speech`. |
| `video-scripts/<id>/script.json` | Stage 2 output, checked in — the reviewable/editable artifact. Edit text here, re-render; never edit video. |
| `video/src/` | Remotion project. `WhiteboardVideo.tsx` = generic composition; `components/` = whiteboard kit (Sketch=rough.js shapes, HandText, Bullets, CodePanel, Bars, TokenStrip, Captions); `timing-utils.ts` = cue resolution + beat offsets; `types.ts` = script/timing schema types. |
| `build/`, `public/audio/`, `output/` | Generated (gitignored): bundles, audio+timing, MP4s. |

## Verifying a render

- `grep "cue not found" <render log>` — a warning means a cue phrase doesn't match the narration words; element falls back to drawing at beat start.
- Spot-check sync: `npx remotion ffmpeg -ss <t> -i output/... -frames:v 1 f.png` at 2–3 cue moments; drawing should appear as its concept is narrated.
- Determinism: renders are seeded — same inputs give byte-identical frames (`npx remotion still ... --frame=N` twice, compare hashes).

## Facts worth knowing

- Render time ≈ 3–4× realtime on an M3 (3:39 video ≈ 13 min). Full-course batch is an overnight job.
- Voice: `af_heart` (set per-script; list voices: `curl localhost:8880/v1/audio/voices`). Changing voice/speed requires re-running tts.mjs only.
- Remotion pinned at 4.0.503 across all `@remotion/*` packages — keep versions identical when upgrading.
- tts.mjs patches Kokoro's streaming WAV headers (0xFFFFFFFF placeholder sizes) — don't "simplify" that away.
- The narration rewrite is mandatory: course prose is written to be read, not heard. Never TTS the markdown directly; never speak literal identifiers like `model_context_window_exceeded` (show them in a `code` element instead).
