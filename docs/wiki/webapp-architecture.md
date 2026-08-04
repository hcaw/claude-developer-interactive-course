---
kind: system
---

# Webapp Architecture

Last verified: 2026-08-04 against main (M1–M5 implemented in `webapp/`; see [status.md](status.md))

## System overview

An internal course webapp for the ~20-person distributed Stackdrop team: module/lesson navigation, video playback, readable lessons, graded checkpoint quizzes, automatic progress tracking, and a small admin matrix. Next.js 16 (App Router, TypeScript) on Vercel; user activity in Postgres (schema `course_app`); videos in object storage behind a CDN. Course content is baked in at build time — the app has no CMS and no content database.

**Storage providers are swappable by environment variable.** Until AWS access arrives the app runs on Neon Postgres and Cloudflare R2, both free tier; the AWS targets (RDS, S3+CloudFront) are unchanged and reached by editing `DATABASE_URL` and `NEXT_PUBLIC_VIDEO_BASE_URL`. No application code differs between the two. See [adr/2026-08-03-07](../adr/2026-08-03-07-free-tier-mvp-before-aws-access.md).

## Bird's eye view

```
course-content/*.md ──parse──▶ build/bundles/*.json ─┐
video-scripts/*/script.json ──(`covers`: video↔lesson)──┼─▶ generate-content.mjs
output/module-N/*.mp4 ───────────────────────────────┘        │
        │                                     ┌───────────────┴───────────────┐
        │ aws s3 sync                         ▼                               ▼
        ▼                            src/content/manifest.json   src/content/answer-key.json
R2 today / S3+CloudFront on AWS-day         (client-safe)          (server-only)
                             ▲                                          │
                             │ <video src>                              │ grading routes only
Browser ◀──▶ Vercel (Next.js: RSC pages + API routes) ◀── Drizzle ──▶ Postgres `course_app`
                  src/proxy.ts: Auth.js (Google, JWT, env allowlist)
```

> **Next.js 16 renamed `middleware.ts` to `proxy.ts`.** Same behaviour, same `config.matcher`. Next's own docs are explicit that this layer is for optimistic checks, not authorization — so the real gate is `src/lib/session.ts` (`requireUser` / `requireAdmin` / `requireApiUser`), which every page and API route calls. That is also what makes the allowlist genuinely re-checked per request.

## Planned module map (`webapp/`)

| Path | Responsibility | Talks to |
|---|---|---|
| `scripts/generate-content.mjs` | Bundles + scripts + videos → manifest (lessons), answer-key, content-report. Whitelists output fields; fails on new anomalies, duplicate slugs, unresolved `covers`, or a lesson claimed by two videos. | `../build/bundles`, `../video-scripts`, `../output` |
| `scripts/sync-videos.sh` | `aws s3 sync output/ s3://…/videos/` with immutable cache headers. `VIDEO_S3_ENDPOINT` targets R2; unset for S3. Forces `AWS_REGION=auto` and relaxed checksums, which R2 requires. | R2 / S3 |
| `src/content/` | Generated manifest (client-safe) + answer keys (`import 'server-only'`) + typed re-exports | consumed app-wide |
| `src/db/` | Drizzle schema (`pgSchema('course_app')`) + node-postgres Pool (`max: 1`, memoized on `globalThis`). TLS always verified; the RDS CA bundle is optional via `DB_CA_BUNDLE_PATH`. | Neon / RDS |
| `src/db/ssl.ts` | Strips libpq `sslmode`/`sslrootcert` from the URL so the explicit `ssl` options actually govern verification | `src/db/index.ts` |
| `scripts/create-app-role.sql` | Creates `course_app_user`, gives it the schema, locks it out of `public`. Run once as the DB owner. | Neon / RDS |
| `scripts/migrate.mjs` | Applies migrations and reports the real Postgres error (`drizzle-kit migrate` swallows it) | `drizzle/` |
| `src/auth.config.ts` | Edge-safe Auth.js config: Google provider, allowlist callbacks. Must never import the adapter or `pg`. | `src/proxy.ts` |
| `src/auth.ts` | Full Auth.js init: Drizzle adapter + JWT strategy | `src/db` |
| `src/proxy.ts` | Optimistic route protection (Next 16's renamed middleware) | `src/auth.config.ts` |
| `src/lib/session.ts` | `getSessionState` (anonymous / revoked / ok) + `requireUser` / `requireAdmin` / `requireApiUser` — the actual per-request authorization gate | `src/auth.ts`, `access.ts` |
| `src/lib/allowlist.ts` | Pure domain rule from env. Edge-safe, fails closed when unset. | — |
| `src/lib/access.ts` | DB-backed admin + revocation, audit writes. No env override — `users.is_admin` is the only source ([adr/2026-08-04-10](../adr/2026-08-04-10-remove-env-admin-bootstrap.md)) | `src/db` |
| `scripts/grant-admin.mjs` | `npm run admin:grant -- <email>`: the first admin, and break-glass. UPDATEs an existing row (an INSERT would break their first sign-in with `OAuthAccountNotLinked`) and audits it as a system event. | `course_app.users` |
| `src/app/admin/actions.ts` | Promote / demote / revoke / restore. Each re-checks admin rights. | `access.ts` |
| `src/lib/progress.ts` | THE completion derivation function + `QUIZ_PASS_THRESHOLD = 0.7`. Per **lesson**, not per section ([adr/2026-08-04-11](../adr/2026-08-04-11-lesson-as-the-unit.md)). SQL never re-implements this. | manifest, activity rows |
| `src/lib/activity.ts` | Loads activity rows, derives, appends `completion_events`; admin's all-users read | `src/db`, `progress.ts` |
| `src/lib/video-progress.ts` | The heartbeat upsert, isolated so it can be tested against a real Postgres | `src/db/schema` |
| `src/components/` | `video-player` (heartbeat/resume), `block-renderer` + `inline-md` (6 block types, hand-rolled inline markdown), `quiz` (radio + checkbox questions, trailing gated behind grading), `self-assess` (free-text + localStorage draft + reveal), `record-view` | API routes |
| `src/components/ui/` + `src/app/globals.css` | Stackdrop design system: vendored tokens (light+dark, dark default) and primitives. See [webapp-design-system.md](webapp-design-system.md) | consumed app-wide |
| `src/app/` | Dashboard, `modules/[module]`, `lessons/[slug]`, `admin/` (RSC-fetched, `isAdmin` gate), `login`, API routes | everything above |

## Data flow

1. **Watch**: `video-player` throttles `timeupdate` → POST `/api/progress/heartbeat` every 10s (+ `sendBeacon` flush on pause/ended/pagehide) → upsert `video_progress` (position + high-water mark) → server sets `completed_at` at ≥90% → derive → append `completion_events` on transition.
2. **Quiz**: `quiz` component → POST `/api/quiz/submit` → grade against server-only answer key → insert `quiz_attempts` → derive → events → return per-question results + debrief blocks.
3. **Reveal** (free-form assessments): the SelfAssess answer box keeps a draft in localStorage (client-only, deliberately not server-persisted); "Compare with model answer" POSTs `/api/assessment/reveal` → upsert `manual_completions` → model-answer blocks render under the learner's own text. One click = content + credit (accepted casual-gating tradeoff).
4. **Read** (the 33 lessons with nothing to watch or answer): `record-view` posts once from an effect on mount → POST `/api/progress/complete` → upsert `manual_completions`. An effect, not a server write during render: Next prefetches `<Link>` targets on hover, and a write there would complete lessons the learner only pointed at.
5. **Admin**: `/admin` RSC runs four selects (users, video_progress, best attempts via `DISTINCT ON`, manual_completions) → `deriveProgress()` → users × modules matrix.

## Invariants and boundaries

- Answer keys never reach the client: only grading routes import the answer-key module; it starts with `import 'server-only'`. Verify with a bundle grep for a known explanation string. ([adr/2026-08-01-04](../adr/2026-08-01-04-course-content-static-at-build.md))
- Generated content files are never hand-edited; regenerate via `content:gen`.
- Video URLs are unsigned and gating is the app login plus unadvertised URLs, on either provider. On AWS the bucket blocks public access and only CloudFront (OAC) reads it. ([adr/2026-08-01-02](../adr/2026-08-01-02-s3-cloudfront-video-hosting.md))
- TLS to Postgres is always verified. `rejectUnauthorized: false` is forbidden; the RDS CA bundle is supplied via `DB_CA_BUNDLE_PATH` when the provider needs it. ([adr/2026-08-01-03](../adr/2026-08-01-03-nextjs-vercel-rds-monorepo-stack.md), [adr/2026-08-03-07](../adr/2026-08-03-07-free-tier-mvp-before-aws-access.md))
- **`sslmode` must never reach the driver.** node-postgres silently gives a connection string's `sslmode` precedence over the `ssl` option object: with `?sslmode=require` present, `rejectUnauthorized: true` and any `ca` are ignored outright — verified against Neon, where a deliberately bogus CA still connected, as did `rejectUnauthorized: false`. `src/db/ssl.ts` strips `sslmode`/`sslrootcert`/`sslcert`/`sslkey` on the way into the pool so the explicit options decide, and `scripts/migrate.mjs` mirrors it. `DATABASE_URL` keeps `sslmode=require` because psql needs it. Guarded by `src/db/ssl.test.ts`.
- The heartbeat's high-water mark never retreats and `completed_at` is frozen once set — both enforced in SQL, because overlapping heartbeats and late `sendBeacon` flushes routinely arrive out of order. Covered by `npm run test:db`.
- All routes behind the proxy except `/login`, `/no-access` and `/api/auth/*`. Access is re-checked per request in `src/lib/session.ts` — the domain rule from env, plus `revoked_at` and `is_admin` from the DB. ([adr/2026-08-01-05](../adr/2026-08-01-05-google-auth-jwt-env-allowlist.md), [adr/2026-08-04-08](../adr/2026-08-04-08-db-backed-access-control.md))
- Revoked users are redirected to `/no-access`, never `/login` — `/login` would bounce them back through Google and loop. `auth.ts` also refuses them a session at sign-in.
- Server actions re-check admin rights themselves. Rendering them on an admin-only page is not authorization; they are addressable endpoints.
- The proxy answers unauthenticated **API** requests with `401 {"error":"unauthorized"}` and only redirects **page** requests. `fetch` follows redirects transparently, so a 307 to `/login` would hand the client 200 + HTML and surface as a JSON parse failure rather than an auth failure.
- DB writes only through the activity tables in [webapp-data-model.md](webapp-data-model.md); `completion_events` is append-only.
- Lesson pages render dynamically (they read session + DB); never let Next static-optimize them.
- `/api/progress/complete` accepts only the manifest's `viewOnlyLessonKeys`. It must never become a general mark-anything-done endpoint, or video and quiz requirements become bypassable.
- Every lesson renders its title exactly once, from frontmatter. The generator strips the leading `# Title` heading and **fails** if one does not match — that check is what keeps the two in step.
- Quiz `trailing` blocks and the debrief render only after an attempt (and on revisit once passed) — trailing regularly discusses the options. Non-required (debrief) videos on assessment lessons render below the task, not above it (adr/2026-08-04-12).

## External dependencies

| Dependency | Used for | Failure mode we accept |
|---|---|---|
| CloudFront + S3 | Video delivery | Videos down = pages still render (articles remain usable) |
| RDS Postgres (public + TLS) | Activity data | App down; internal tool, no SLA |
| Vercel | Hosting | "To start" — migration off is an anticipated path |
| Google OAuth | Sign-in | No fallback; everyone has Google |

## Infra runbook — free stack (current)

1. **Neon**: sign up, create project `course-app`. Then, as the **owner** role (`neondb_owner`):
   `psql "$OWNER_URL" -v app_password="$(openssl rand -base64 24 | tr -d '/+=')" -f scripts/create-app-role.sql`
   It creates `course_app_user`, gives it the `course_app` schema, locks it out of `public`, and prints the `DATABASE_URL` to paste into `webapp/.env` (or `.env.local`). Use the **pooled** (`-pooler`) host for the app and the **direct** host for migrations. Then `DATABASE_URL=<direct> node scripts/migrate.mjs` from a dev machine.
   - `drizzle/0000_init.sql` deliberately has no `CREATE SCHEMA`: the app role lacks CREATE-on-database, and Postgres checks that privilege before `IF NOT EXISTS`. The role script is the prerequisite.
   - The role script grants CREATE **on the database** anyway, because the Drizzle migrator unconditionally issues `CREATE SCHEMA IF NOT EXISTS` for its journal schema. The journal is relocated into `course_app` (`migrations` in `drizzle.config.ts`) so nothing else is needed; `public` stays revoked.
   - Use `scripts/migrate.mjs`, not `drizzle-kit migrate` — the latter renders a spinner that swallows the driver error and exits 1, so a permission failure is indistinguishable from a syntax failure.
2. **Cloudflare R2**: create bucket, enable the managed `r2.dev` public URL, create an S3-API token. Upload with `VIDEO_BUCKET=… VIDEO_S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com ./scripts/sync-videos.sh`.
3. **Google OAuth client** and **Vercel** as in steps 4–5 below.

Verify: `curl -I -H "Range: bytes=0-1023" "$NEXT_PUBLIC_VIDEO_BASE_URL/module-1/m1-01-orientation.mp4"` → `206`.

## Infra runbook — AWS (target, not yet executed)

1. **S3**: create private bucket, block all public access; upload via `scripts/sync-videos.sh` with `VIDEO_S3_ENDPOINT` unset (`--cache-control "public, max-age=31536000, immutable"`, keeps `module-N/<id>.mp4` layout).
2. **CloudFront**: OAC (sigv4, always sign) → distribution: S3 REST origin, GET/HEAD, CachingOptimized, HTTPS-only. No CORS policy needed (same-page `<video>` without `crossorigin`; Range requests pass through). Bucket policy: `s3:GetObject` for `cloudfront.amazonaws.com` conditioned on the distribution ARN. Verify: `curl -I -H "Range: bytes=0-1023" https://<dist>.cloudfront.net/videos/module-1/m1-01-orientation.mp4` → `206`.
3. **RDS** (as master): `CREATE ROLE course_app_user LOGIN PASSWORD '…'; CREATE SCHEMA course_app AUTHORIZATION course_app_user; ALTER ROLE course_app_user SET search_path = course_app;` Then `npx drizzle-kit generate && npx drizzle-kit migrate` from a dev machine (never in the Vercel build). CA bundle: `curl -o webapp/certs/rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem`.
4. **Google OAuth client**: consent screen Internal; redirect URIs `http://localhost:3000/api/auth/callback/google` + prod domain.
5. **Vercel**: Root Directory `webapp`; env vars below.

## Environment variables

Template with commentary: `webapp/.env.example`.

`DATABASE_URL` (as `course_app_user`) · `AUTH_SECRET` · `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` · `ALLOWED_EMAIL_DOMAINS` / `ALLOWED_EMAILS` (comma-separated, case-insensitive) · `NEXT_PUBLIC_VIDEO_BASE_URL`

There is deliberately **no admin variable**. Admin rights live only in `users.is_admin`; the first one is granted with `npm run admin:grant -- <email>` ([adr/2026-08-04-10](../adr/2026-08-04-10-remove-env-admin-bootstrap.md)).

Situational: `DB_CA_BUNDLE_PATH` (AWS-day only) · `AUTH_TRUST_HOST=true` (only to run a production build locally; Vercel and `next dev` trust the host already) · `VIDEO_BUCKET` / `VIDEO_S3_ENDPOINT` (local, for `sync-videos.sh` only).

## Commands

`npm run content:gen` regenerate `src/content/*` · `content:check` fail on drift · `npm test` unit tests (no DB) · `npm run test:db` heartbeat integration tests, needs `TEST_DATABASE_URL` · `npm run admin:grant -- <email>` · `npm run build`.

## Build milestones

M1 static browse → M2 auth → M3 DB + video progress → M4 assessments → M5 admin + deploy. All five implemented; deployment pending credentials. Tracked in [status.md](status.md).

## Key decisions

- Hosting/CDN: [adr/2026-08-01-02-s3-cloudfront-video-hosting.md](../adr/2026-08-01-02-s3-cloudfront-video-hosting.md)
- Stack/monorepo/RDS: [adr/2026-08-01-03-nextjs-vercel-rds-monorepo-stack.md](../adr/2026-08-01-03-nextjs-vercel-rds-monorepo-stack.md)
- Content at build time: [adr/2026-08-01-04-course-content-static-at-build.md](../adr/2026-08-01-04-course-content-static-at-build.md)
- Auth: [adr/2026-08-01-05-google-auth-jwt-env-allowlist.md](../adr/2026-08-01-05-google-auth-jwt-env-allowlist.md)
- Data model: [adr/2026-08-01-06-activity-only-data-model-derived-completion.md](../adr/2026-08-01-06-activity-only-data-model-derived-completion.md)
- Free-tier bridge (Neon + R2) before AWS access: [adr/2026-08-03-07-free-tier-mvp-before-aws-access.md](../adr/2026-08-03-07-free-tier-mvp-before-aws-access.md)
- DB-backed access control: [adr/2026-08-04-08-db-backed-access-control.md](../adr/2026-08-04-08-db-backed-access-control.md), tightened by [adr/2026-08-04-10-remove-env-admin-bootstrap.md](../adr/2026-08-04-10-remove-env-admin-bootstrap.md)
- The lesson as the unit of content, routing and completion: [adr/2026-08-04-11-lesson-as-the-unit.md](../adr/2026-08-04-11-lesson-as-the-unit.md)
