# Claude Developer Interactive Course

Text course → generated whiteboard videos (done) → internal course webapp (next; design approved, no code yet).

## Commands

- Parse course content: `npm run parse` (→ `build/bundles/`, gitignored)
- TTS one section: `node pipeline/tts.mjs <section-id>` (needs local Kokoro, see README)
- Render: `npx remotion render video/src/index.ts <section-id> output/<module>/<section-id>.mp4`

## Hard rules

- Quiz answer keys must never reach any client bundle (adr/2026-08-01-04-course-content-static-at-build)
- Generated content files (`webapp/src/content/*`, once they exist) are never hand-edited — regenerate
- `completion_events` is append-only; completion logic lives only in `webapp/src/lib/progress.ts` (adr/2026-08-01-06-activity-only-data-model-derived-completion)
- Videos↔sections join on `m{module}-{NN}` prefix, never full basename (docs/wiki/course-content-inventory.md)
- Never edit rendered MP4s or TTS the markdown directly; edit `video-scripts/<id>/script.json` and re-render
- Keep all `@remotion/*` packages pinned to the same version; don't "simplify" the WAV-header patch in `pipeline/tts.mjs`
- Docs gate: a task isn't done until affected wiki pages and ADRs are written (docs/index.md)

## Where things are

- Docs map (read first for structural work): docs/index.md
- Webapp design of record: docs/wiki/webapp-architecture.md · data model: docs/wiki/webapp-data-model.md
- Decisions: docs/adr/
