---
kind: status
---

# Status

Last verified: 2026-08-04

## What works today

- **All 67 course videos are rendered** (5 modules, 44 sections, 590 MB in `output/`). The video pipeline (parse → script → TTS → Remotion render) is complete and documented in the repo README.
- **The webapp is implemented, M1–M5** in `webapp/`: content generator, browse pages, Google auth, activity schema, video progress with resume and completion, quizzes and reveals, and the admin matrix. `npm run build` produces 14 routes.
- **Access control is DB-backed** (adr/2026-08-04-08, tightened by adr/2026-08-04-10): admins and revocation live in `users` with an append-only `access_events` audit trail, managed from `/admin`. Only the email-domain rule stays in env — there is no admin variable at all. The nav tab reads **Admin**.
- **Every checkable checkpoint is a graded quiz** (adr/2026-08-04-12): 24 graded lessons / 68 questions (was 8 / 18), covering single-select, multi-select, matching-as-rows and fill-blank. The 13 genuinely free-text checkpoints get a SelfAssess answer box with a localStorage draft and a compare-with-model-answer reveal. Four answer leaks and four lost-question-stems authoring bugs were fixed at the source, and the generator now fails the build on that whole class.
- **The lesson is the unit** (adr/2026-08-04-11): 108 lesson pages at `/lessons/{slug}`, one per authored article, replacing the 44 stacked section pages. Sections survive only as headings on the module page. Videos attach to lessons via each `script.json`'s `covers` array, which is what finally surfaces the **25 debrief videos that never rendered** under the old one-video-per-section model.
- **Verified locally**: all 108 lesson pages resolve (`/sections/*` is gone); no answer-key text appears in any client bundle or in served HTML; 39 unit tests cover completion derivation, the manifest's shape and video mapping, and the domain rule; 16 integration tests cover the heartbeat upsert and access control against a real Postgres.

## In flight

- **Neon is provisioned and migrated** through `drizzle/0002_lesson_completion.sql`. `course_app_user` owns the `course_app` schema (8 tables + migration journal), is locked out of `public`, and the app connects through the pooled endpoint with TLS verified. Existing activity rows survived the lesson restructure untouched — video ids and lesson keys never changed.
- **All 67 videos are live on Cloudflare R2** (563 MB). Range requests return `206`, `Content-Type: video/mp4`, immutable caching; every path in the manifest resolves.
- **Not deployed to Vercel yet** — that is the only remaining step.

## Next

1. **Vercel** (owner, browser): import the repo, Root Directory `webapp`, copy the env vars from `webapp/.env` — but **not** `OWNER_DATABASE_URL`. There is no admin variable to set.
2. Add `https://<vercel-domain>/api/auth/callback/google` to the Google OAuth client's redirect URIs.
3. **Sign in once, then grant admin**: `npm run admin:grant -- <email>` against the production `DATABASE_URL`. The row has to exist first — the script refuses otherwise, and pre-creating it would break that person's first Google sign-in (adr/2026-08-04-10).
4. Walk the end-to-end path: sign in → watch past 90% → the lesson completes → open a watch-out page and confirm it points at the teaching video → pass the `m1` quiz and exercise → read the remaining `m1` lessons → the module-complete page unlocks → `/admin` matches.

## Where things run

Neon (`course_app` schema, eu-central-1) and Cloudflare R2 (videos) are live. Vercel is not set up yet. Free-stack runbook: [webapp-architecture.md](webapp-architecture.md). Moving to S3/CloudFront + RDS when AWS access arrives is an edit to two environment variables and a `pg_dump` — see [adr/2026-08-03-07](../adr/2026-08-03-07-free-tier-mvp-before-aws-access.md).

## Known gaps

- Auth, assessments, and the admin matrix run against live Neon and R2, but have not been exercised through an actual Google sign-in — that needs a browser, so the first real login is the remaining unknown.
- The auto-record-on-view effect (`record-view.tsx`) has been verified at the API and markup level but not in a real browser. Worth confirming on the first login that reading a glossary ticks it complete, and that hovering a lesson link on the module page does **not**.
- `next@16.2.12` carries transitive advisories via `postcss` and `sharp`, and `drizzle-kit` via `esbuild` (dev only). No fixed upstream release exists yet; re-check on the next Next.js release.
