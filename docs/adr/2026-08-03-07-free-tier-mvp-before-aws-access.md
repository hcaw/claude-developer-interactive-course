# Run the MVP on Neon + Cloudflare R2 until AWS access arrives

Date: 2026-08-03
Status: Accepted

## Decision

Until AWS access is available, the webapp runs on free-tier infrastructure:
Neon Postgres for the `course_app` schema and Cloudflare R2 for the 67 course
MP4s. Vercel and Google OAuth are unchanged. Both substitutions are confined
to two environment variables — `DATABASE_URL` and `NEXT_PUBLIC_VIDEO_BASE_URL` —
and no application code differs between the two stacks.

This is a bridge, not a reversal. The RDS and S3+CloudFront targets in
[2026-08-01-02](2026-08-01-02-s3-cloudfront-video-hosting.md) and
[2026-08-01-03](2026-08-01-03-nextjs-vercel-rds-monorepo-stack.md) still stand,
including their runbooks, which are unchanged.

## Context

The webapp design was approved assuming AWS, but AWS access had not been
granted and the course was ready to ship. The two AWS dependencies are the
only ones in the design, and both were already isolated behind environment
variables, so a free stack was reachable without architectural divergence.

ADR-03 rejected Neon as a *permanent* vendor ("a new vendor when RDS is already
paid for and operated"). That reasoning is about steady-state ownership cost
and is untouched by a temporary bridge taken while RDS is unreachable.

Provider choice was driven by what preserves the AWS design rather than by
features:

- **Neon** exposes a standard Postgres TCP endpoint, so node-postgres +
  Drizzle `pgSchema('course_app')` stay byte-identical. Using
  `@neondatabase/serverless` would have been the divergence — it changes the
  driver, so it is explicitly not used.
- **R2** speaks the S3 API and serves a private bucket through a public CDN
  URL, which is the exact shape ADR-02 chose. The app keeps zero signing code,
  and `aws s3 sync` still works with an `--endpoint-url` override. 563 MB fits
  the permanent 10 GB free tier about 18× over, and R2 egress is free.

## Alternatives rejected

- **Wait for AWS access** — no cost, but blocks the course indefinitely on an
  external approval with no committed date.
- **Supabase** — bundles auth and storage too, but replacing Auth.js would
  make the AWS-day switch a rewrite instead of an env change.
- **Vercel Blob / Postgres** — least setup, but metered egress makes video
  hosting the expensive case, which is the one thing R2 gives away.
- **Videos committed to the repo or served from `webapp/public`** — no third
  party, but 563 MB through git and Vercel's deployment size limits.
- **Local-only development, no deployment** — free and simplest, but the point
  was to get the course in front of ~20 people now.

## Consequences

- Two portability seams carry the difference, and both are written
  provider-agnostic:
  - `webapp/src/db/index.ts` — the RDS CA bundle is optional
    (`DB_CA_BUNDLE_PATH`). TLS verification stays on for both providers;
    `rejectUnauthorized: false` remains forbidden, as ADR-03 requires. Neon
    chains to a publicly trusted CA, so Node's default trust store verifies it.
  - `webapp/scripts/sync-videos.sh` — `VIDEO_S3_ENDPOINT` selects R2; unset it
    for plain S3. The `module-N/<id>.mp4` layout ADR-02 mandates is preserved.
- Use Neon's **pooled** (`-pooler`) connection string. The `max: 1` pool and
  `globalThis` memoization from ADR-03 are unchanged.
- Videos are never migrated R2 → S3. Local `output/` is the source of truth, so
  AWS-day just re-runs the sync script against S3.
- Uploading to R2 gives the 67 rendered MP4s their first off-machine backup;
  `output/` is gitignored and existed on one machine only.
- The r2.dev managed URL is rate-limited and Cloudflare discourages it for
  production. Accepted for ~20 internal users; a custom domain is a third
  `NEXT_PUBLIC_VIDEO_BASE_URL` value if it becomes a problem.
- Vercel Hobby is used despite its non-commercial terms. Flagged to and
  accepted by the owner; upgrading is a billing change, not a migration.
- AWS-day is: provision per the existing runbook, re-run `sync-videos.sh`
  without `VIDEO_S3_ENDPOINT`, `pg_dump --schema=course_app` from Neon into
  RDS, set `DB_CA_BUNDLE_PATH`, flip the two env vars, redeploy. No code change.
- When the switch happens, supersede this ADR rather than editing it.
