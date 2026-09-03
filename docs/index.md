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
- [wiki/webapp-design-system.md](wiki/webapp-design-system.md) — Stackdrop UI in the webapp: tokens, type roles, primitives, state-color mapping, kit re-sync runbook
- [wiki/course-content-inventory.md](wiki/course-content-inventory.md) — verified content ground truth: counts, video↔lesson `covers` join, quiz classification rule, known anomalies
- [script-format.md](script-format.md) — video pipeline: script.json schema reference (predates the wiki; pipeline reference doc)
- [video-pipeline-approach.md](video-pipeline-approach.md) — video pipeline: research + decisions (predates the wiki)

## Start here if you're product / checking progress

- [wiki/status.md](wiki/status.md) — what works, what's next (webapp milestones M1–M5)

## Decisions (why things are the way they are)

- [adr/2026-08-01-01-record-adrs.md](adr/2026-08-01-01-record-adrs.md) — adopt ADRs
- [adr/2026-08-01-02-s3-cloudfront-video-hosting.md](adr/2026-08-01-02-s3-cloudfront-video-hosting.md) — S3 + CloudFront (OAC), casual gating; 8 providers rejected
- [adr/2026-08-01-03-nextjs-vercel-rds-monorepo-stack.md](adr/2026-08-01-03-nextjs-vercel-rds-monorepo-stack.md) — Next.js in `webapp/`, Vercel, existing RDS schema `course_app`
- [adr/2026-08-01-04-course-content-static-at-build.md](adr/2026-08-01-04-course-content-static-at-build.md) — content baked at build; answer keys server-only
- [adr/2026-08-01-05-google-auth-jwt-env-allowlist.md](adr/2026-08-01-05-google-auth-jwt-env-allowlist.md) — Google + JWT sessions + env allowlist *(access-control half superseded by 2026-08-04-08)*
- [adr/2026-08-01-06-activity-only-data-model-derived-completion.md](adr/2026-08-01-06-activity-only-data-model-derived-completion.md) — activity-only DB, derived completion, transition events *(the unit moved from section to lesson in 2026-08-04-11)*
- [adr/2026-08-03-07-free-tier-mvp-before-aws-access.md](adr/2026-08-03-07-free-tier-mvp-before-aws-access.md) — Neon + Cloudflare R2 as a free bridge until AWS access; two env vars, no code change
- [adr/2026-08-04-08-db-backed-access-control.md](adr/2026-08-04-08-db-backed-access-control.md) — admin + revocation move to the DB with an audit trail; only the domain rule stays in env *(the env bootstrap is removed by 2026-08-04-10)*
- [adr/2026-08-04-09-adopt-stackdrop-design-system.md](adr/2026-08-04-09-adopt-stackdrop-design-system.md) — vendor Stackdrop UI tokens + primitives; strict-amber state mapping (no green); dark default with light toggle
- [adr/2026-08-04-10-remove-env-admin-bootstrap.md](adr/2026-08-04-10-remove-env-admin-bootstrap.md) — delete `BOOTSTRAP_ADMIN_EMAILS`; `users.is_admin` is the only source, seeded by `npm run admin:grant`
- [adr/2026-08-04-11-lesson-as-the-unit.md](adr/2026-08-04-11-lesson-as-the-unit.md) — one article = one lesson = one page = one unit of completion; sections deleted; videos join via `covers`
- [adr/2026-08-04-12-interactive-checkpoints.md](adr/2026-08-04-12-interactive-checkpoints.md) — every checkable checkpoint becomes a graded quiz (24 lessons / 68 questions); free-text gets SelfAssess with local drafts; the authoring convention and content guards
- [adr/2026-09-03-01-anki-spaced-repetition-deck.md](adr/2026-09-03-01-anki-spaced-repetition-deck.md) — `anki/` deck compiled from LLM-authored card JSON; deck stops at module, tags carry section + content-type; namespaced so future courses are new data files, not code changes

## Stream

- [stream/2026-08-01-webapp-planning.plan.md](stream/2026-08-01-webapp-planning.plan.md) — webapp planning session: hosting research, decision interview, docs-first pivot
