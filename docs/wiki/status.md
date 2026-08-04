---
kind: status
---

# Status

Last verified: 2026-08-04

## What works today

- **All 67 course videos are rendered** (5 modules, 44 sections, 590 MB in `output/`). The video pipeline (parse → script → TTS → Remotion render) is complete and documented in the repo README.
- **The webapp is implemented, M1–M5** in `webapp/`: content generator, browse pages, Google auth, activity schema, video progress with resume and completion, quizzes and reveals, and the admin matrix. `npm run build` produces 12 routes.
- **Access control is DB-backed** (adr/2026-08-04-08): admins and revocation live in `users` with an append-only `access_events` audit trail, managed from `/admin`. Only the email-domain rule stays in env.
- **Verified locally**: all 44 section pages render; no answer-key text appears in any client bundle (87 probes) or in served HTML; 24 unit tests cover completion derivation and the domain rule; 16 integration tests cover the heartbeat upsert and access control against a real Postgres.

## In flight

- **Neon is provisioned and migrated.** `course_app_user` owns the `course_app` schema (8 tables + migration journal), is locked out of `public`, and the app connects through the pooled endpoint with TLS verified.
- **All 67 videos are live on Cloudflare R2** (563 MB). Range requests return `206`, `Content-Type: video/mp4`, immutable caching; every path in the manifest resolves.
- **Not deployed to Vercel yet** — that is the only remaining step.

## Next

1. **Vercel** (owner, browser): import the repo, Root Directory `webapp`, copy the env vars from `webapp/.env` — but **not** `OWNER_DATABASE_URL`, and set `BOOTSTRAP_ADMIN_EMAILS`.
2. Add `https://<vercel-domain>/api/auth/callback/google` to the Google OAuth client's redirect URIs.
3. Walk the end-to-end path: sign in → watch past 90% → section completes → pass `m1-06` → module 1 completes → `/admin` matches.

## Where things run

Neon (`course_app` schema, eu-central-1) and Cloudflare R2 (videos) are live. Vercel is not set up yet. Free-stack runbook: [webapp-architecture.md](webapp-architecture.md). Moving to S3/CloudFront + RDS when AWS access arrives is an edit to two environment variables and a `pg_dump` — see [adr/2026-08-03-07](../adr/2026-08-03-07-free-tier-mvp-before-aws-access.md).

## Known gaps

- Auth, assessments, and the admin matrix run against live Neon and R2, but have not been exercised through an actual Google sign-in — that needs a browser, so the first real login is the remaining unknown.
- `next@16.2.12` carries transitive advisories via `postcss` and `sharp`, and `drizzle-kit` via `esbuild` (dev only). No fixed upstream release exists yet; re-check on the next Next.js release.
