# Claude Developer Interactive Course

Text course → generated whiteboard videos (done) → internal course webapp (M1–M5 built in `webapp/`, not yet deployed — deployment is blocked on Phase 0 accounts; see docs/wiki/status.md).

## Commands

Video pipeline (repo root):

- Parse course content: `npm run parse` (→ `build/bundles/`, gitignored)
- TTS one section: `node pipeline/tts.mjs <section-id>` (needs local Kokoro, see README)
- Render: `npx remotion render video/src/index.ts <section-id> output/<module>/<section-id>.mp4`

Webapp (`cd webapp`, its own `package.json`):

- `npm run content:gen` regenerate `src/content/*` after any course-content edit · `content:check` fails on drift
- `npm test` unit tests · `npm run test:db` heartbeat integration tests (needs `TEST_DATABASE_URL`)
- `npm run dev` / `npm run build`

## Hard rules

- Quiz answer keys must never reach any client bundle (adr/2026-08-01-04-course-content-static-at-build). `webapp/src/content/answer-key.ts` starts with `import 'server-only'`; only grading routes may import it
- Generated content files (`webapp/src/content/manifest.json`, `answer-key.json`, `content-report.json`) are never hand-edited — run `npm run content:gen` and commit
- `webapp/scripts/generate-content.mjs` must exit non-zero on any anomaly it doesn't already whitelist (currently the two m2-04 / m2-06 checkpoints)
- Never weaken DB TLS: `rejectUnauthorized: false` is forbidden. Provider differences go through `DB_CA_BUNDLE_PATH` (adr/2026-08-03-07)
- Provider swaps are env-only: `DATABASE_URL` and `NEXT_PUBLIC_VIDEO_BASE_URL`. Don't add provider-specific drivers (e.g. `@neondatabase/serverless`)
- `completion_events` is append-only; completion logic lives only in `webapp/src/lib/progress.ts` (adr/2026-08-01-06-activity-only-data-model-derived-completion)
- Videos↔sections join on `m{module}-{NN}` prefix, never full basename (docs/wiki/course-content-inventory.md)
- Never edit rendered MP4s or TTS the markdown directly; edit `video-scripts/<id>/script.json` and re-render
- Keep all `@remotion/*` packages pinned to the same version; don't "simplify" the WAV-header patch in `pipeline/tts.mjs`
- Docs gate: a task isn't done until affected wiki pages and ADRs are written (docs/index.md)

## Where things are

- Docs map (read first for structural work): docs/index.md
- Webapp design of record: docs/wiki/webapp-architecture.md · data model: docs/wiki/webapp-data-model.md
- Decisions: docs/adr/
