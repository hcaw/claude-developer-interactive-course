---
kind: system
---

# Webapp Architecture

Last verified: 2026-08-01 against main (design of record — `webapp/` code not yet written; see [status.md](status.md))

## System overview

An internal course webapp for the ~20-person distributed Stackdrop team: module/section navigation, video playback, readable articles, graded checkpoint quizzes, automatic progress tracking, and a small admin matrix. Next.js (App Router, TypeScript) on Vercel; user activity in the existing RDS Postgres (schema `course_app`); videos on S3 behind CloudFront. Course content is baked in at build time — the app has no CMS and no content database.

## Bird's eye view

```
course-content/*.md ──parse──▶ build/bundles/*.json ─┐
video-scripts/*/script.json ─────────────────────────┼─▶ generate-content.mjs
output/module-N/*.mp4 ──(existence check)────────────┘        │
        │                                     ┌───────────────┴───────────────┐
        │ aws s3 sync                         ▼                               ▼
        ▼                            src/content/manifest.json   src/content/answer-key.json
S3 (private) ◀── OAC ── CloudFront          (client-safe)          (server-only)
                             ▲                                          │
                             │ <video src>                              │ grading routes only
Browser ◀──▶ Vercel (Next.js: RSC pages + API routes) ◀── Drizzle ──▶ RDS `course_app`
                  middleware: Auth.js (Google, JWT, env allowlist)
```

## Planned module map (`webapp/`)

| Path | Responsibility | Talks to |
|---|---|---|
| `scripts/generate-content.mjs` | Bundles + scripts → manifest, answer-key, content-report. Whitelists output fields; fails on new anomalies. | `../build/bundles`, `../video-scripts`, `../output` |
| `scripts/sync-videos.sh` | `aws s3 sync output/ s3://…/videos/` with immutable cache headers | S3 |
| `src/content/` | Generated manifest (client-safe) + answer keys (`import 'server-only'`) + typed re-exports | consumed app-wide |
| `src/db/` | Drizzle schema (`pgSchema('course_app')`) + node-postgres Pool (`max: 1`, memoized on `globalThis`, TLS via `certs/rds-global-bundle.pem`) | RDS |
| `src/auth.config.ts` | Edge-safe Auth.js config: Google provider, allowlist callbacks. Must never import the adapter or `pg`. | middleware |
| `src/auth.ts` | Full Auth.js init: Drizzle adapter + JWT strategy | `src/db` |
| `src/lib/progress.ts` | THE completion derivation function + `QUIZ_PASS_THRESHOLD = 0.7`. SQL never re-implements this. | manifest, activity rows |
| `src/components/` | `video-player` (heartbeat/resume), `block-renderer` + `inline-md` (6 block types, hand-rolled inline markdown), `quiz`, `assessment-reveal`, `mark-complete` | API routes |
| `src/app/` | Dashboard, `modules/[module]`, `sections/[sectionId]`, `admin/` (RSC-fetched, `isAdmin` gate), `login`, API routes | everything above |

## Data flow

1. **Watch**: `video-player` throttles `timeupdate` → POST `/api/progress/heartbeat` every 10s (+ `sendBeacon` flush on pause/ended/pagehide) → upsert `video_progress` (position + high-water mark) → server sets `completed_at` at ≥90% → derive → append `completion_events` on transition.
2. **Quiz**: `quiz` component → POST `/api/quiz/submit` → grade against server-only answer key → insert `quiz_attempts` → derive → events → return per-question results + debrief blocks.
3. **Reveal** (free-form assessments): POST `/api/assessment/reveal` → upsert `manual_completions` → return model-answer blocks. One click = content + credit (accepted casual-gating tradeoff).
4. **Admin**: `/admin` RSC runs four selects (users, video_progress, best attempts via `DISTINCT ON`, manual_completions) → `deriveProgress()` → users × modules matrix.

## Invariants and boundaries

- Answer keys never reach the client: only grading routes import the answer-key module; it starts with `import 'server-only'`. Verify with a bundle grep for a known explanation string. ([adr/2026-08-01-04](../adr/2026-08-01-04-course-content-static-at-build.md))
- Generated content files are never hand-edited; regenerate via `content:gen`.
- The S3 bucket blocks all public access; only CloudFront (OAC) reads it. No signing code in the app. ([adr/2026-08-01-02](../adr/2026-08-01-02-s3-cloudfront-video-hosting.md))
- All routes behind middleware except `/login` and `/api/auth/*`; allowlist re-checked per request. ([adr/2026-08-01-05](../adr/2026-08-01-05-google-auth-jwt-env-allowlist.md))
- DB writes only through the activity tables in [webapp-data-model.md](webapp-data-model.md); `completion_events` is append-only.
- Section pages render dynamically (they read session + DB); never let Next static-optimize them.

## External dependencies

| Dependency | Used for | Failure mode we accept |
|---|---|---|
| CloudFront + S3 | Video delivery | Videos down = pages still render (articles remain usable) |
| RDS Postgres (public + TLS) | Activity data | App down; internal tool, no SLA |
| Vercel | Hosting | "To start" — migration off is an anticipated path |
| Google OAuth | Sign-in | No fallback; everyone has Google |

## Infra runbook (ordered, not yet executed)

1. **S3**: create private bucket, block all public access; upload via `scripts/sync-videos.sh` (`--cache-control "public, max-age=31536000, immutable"`, keeps `module-N/<id>.mp4` layout).
2. **CloudFront**: OAC (sigv4, always sign) → distribution: S3 REST origin, GET/HEAD, CachingOptimized, HTTPS-only. No CORS policy needed (same-page `<video>` without `crossorigin`; Range requests pass through). Bucket policy: `s3:GetObject` for `cloudfront.amazonaws.com` conditioned on the distribution ARN. Verify: `curl -I -H "Range: bytes=0-1023" https://<dist>.cloudfront.net/videos/module-1/m1-01-orientation.mp4` → `206`.
3. **RDS** (as master): `CREATE ROLE course_app_user LOGIN PASSWORD '…'; CREATE SCHEMA course_app AUTHORIZATION course_app_user; ALTER ROLE course_app_user SET search_path = course_app;` Then `npx drizzle-kit generate && npx drizzle-kit migrate` from a dev machine (never in the Vercel build). CA bundle: `curl -o webapp/certs/rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem`.
4. **Google OAuth client**: consent screen Internal; redirect URIs `http://localhost:3000/api/auth/callback/google` + prod domain.
5. **Vercel**: Root Directory `webapp`; env vars below.

## Environment variables

`DATABASE_URL` (as `course_app_user`) · `AUTH_SECRET` · `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` · `ALLOWED_EMAIL_DOMAINS` / `ALLOWED_EMAILS` (comma-separated, case-insensitive) · `ADMIN_EMAILS` · `NEXT_PUBLIC_VIDEO_BASE_URL` (`https://<dist>.cloudfront.net/videos`)

## Build milestones

M1 static browse (generator + renderers + pages + video via CloudFront) → M2 auth → M3 DB + video progress → M4 assessments → M5 admin + deploy. Each is demoable; tracked in [status.md](status.md).

## Key decisions

- Hosting/CDN: [adr/2026-08-01-02-s3-cloudfront-video-hosting.md](../adr/2026-08-01-02-s3-cloudfront-video-hosting.md)
- Stack/monorepo/RDS: [adr/2026-08-01-03-nextjs-vercel-rds-monorepo-stack.md](../adr/2026-08-01-03-nextjs-vercel-rds-monorepo-stack.md)
- Content at build time: [adr/2026-08-01-04-course-content-static-at-build.md](../adr/2026-08-01-04-course-content-static-at-build.md)
- Auth: [adr/2026-08-01-05-google-auth-jwt-env-allowlist.md](../adr/2026-08-01-05-google-auth-jwt-env-allowlist.md)
- Data model: [adr/2026-08-01-06-activity-only-data-model-derived-completion.md](../adr/2026-08-01-06-activity-only-data-model-derived-completion.md)
