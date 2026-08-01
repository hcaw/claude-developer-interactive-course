# Docs Index

The map of this repo's documentation. Layers: `docs/wiki/` is rewritable
current truth (wiki wins conflicts), `docs/adr/` is append-only rationale
(supersede, never edit), `docs/stream/` is append-only dated working
artifacts. Conventions follow the `ai-dev-docs` skill; ADR filenames are
`YYYY-MM-DD-nn-slug.md`, stream files are `YYYY-MM-DD-topic.type.md`.

## Start here if you're driving an agent (or new to the repo)

- [wiki/architecture.md](wiki/architecture.md) — repo orientation: the two systems (video pipeline, webapp) and where their docs live
- [wiki/webapp-architecture.md](wiki/webapp-architecture.md) — webapp design of record: modules, flows, invariants, infra runbook, env vars
- [wiki/webapp-data-model.md](wiki/webapp-data-model.md) — `course_app` schema DDL, completion derivation rules, route→table map
- [wiki/course-content-inventory.md](wiki/course-content-inventory.md) — verified content ground truth: counts, video↔section join rule, quiz classification rule, known anomalies
- [script-format.md](script-format.md) — video pipeline: script.json schema reference (predates the wiki; pipeline reference doc)
- [video-pipeline-approach.md](video-pipeline-approach.md) — video pipeline: research + decisions (predates the wiki)

## Start here if you're product / checking progress

- [wiki/status.md](wiki/status.md) — what works, what's next (webapp milestones M1–M5)

## Decisions (why things are the way they are)

- [adr/2026-08-01-01-record-adrs.md](adr/2026-08-01-01-record-adrs.md) — adopt ADRs
- [adr/2026-08-01-02-s3-cloudfront-video-hosting.md](adr/2026-08-01-02-s3-cloudfront-video-hosting.md) — S3 + CloudFront (OAC), casual gating; 8 providers rejected
- [adr/2026-08-01-03-nextjs-vercel-rds-monorepo-stack.md](adr/2026-08-01-03-nextjs-vercel-rds-monorepo-stack.md) — Next.js in `webapp/`, Vercel, existing RDS schema `course_app`
- [adr/2026-08-01-04-course-content-static-at-build.md](adr/2026-08-01-04-course-content-static-at-build.md) — content baked at build; answer keys server-only
- [adr/2026-08-01-05-google-auth-jwt-env-allowlist.md](adr/2026-08-01-05-google-auth-jwt-env-allowlist.md) — Google + JWT sessions + env allowlist
- [adr/2026-08-01-06-activity-only-data-model-derived-completion.md](adr/2026-08-01-06-activity-only-data-model-derived-completion.md) — activity-only DB, derived completion, transition events

## Stream

- [stream/2026-08-01-webapp-planning.plan.md](stream/2026-08-01-webapp-planning.plan.md) — webapp planning session: hosting research, decision interview, docs-first pivot
