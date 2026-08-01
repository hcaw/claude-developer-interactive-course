# Store only user activity; derive completion, snapshot transitions

Date: 2026-08-01
Status: Accepted

## Decision

The database stores user-activity primitives only — no content tables.
Section/module completion is derived on read by one pure function; on each
false→true transition an immutable `completion_events` row is appended for
reporting. DDL and derivation rules:
[../wiki/webapp-data-model.md](../wiki/webapp-data-model.md).

## Context

Content is baked into the app (2026-08-01-04-course-content-static-at-build);
content rows in Postgres would be a second source of truth needing seeding.
~20 users makes derivation trivial. Each sub-decision below was reviewed
individually with the team on 2026-08-01.

## Alternatives rejected

- **Mirrored content tables / sections anchor table** — FK integrity and
  SQL-joinable titles, but a seeding step on every content change; string
  ids validated against the manifest instead.
- **Materialized completion as source of truth** — every write re-checks
  and inserts; threshold changes need backfills. Derivation makes rule
  changes retroactive free; events stay analytics-only.
- **Nightly/on-demand snapshots** — day-granularity timestamps plus a job;
  transition events give exact `earned_at` with no cron.
- **Watched-segments video tracking** — compliance-grade machinery for a
  trusted team; high-water mark ≥90% accepted, gameable by seeking.
- **Latest-attempt-only / normalized quiz answers** — history powers
  first-try analytics; positional jsonb letters suffice for 18 questions.
- **`course_id` everywhere now** — YAGNI. Revisit trigger: a second course
  collides with ids like `m1-01-orientation` → one migration adds
  `course_id` and widens PKs.
- **Delete/soft-delete users on offboarding** — records retained forever;
  access removal is the allowlist's job (2026-08-01-05). Cascades are
  hygiene, not a workflow.

## Consequences

- Completion logic lives only in `webapp/src/lib/progress.ts`; SQL never
  re-implements it — reporting reads `completion_events` (append-only).
- Every write that can flip completion (heartbeat, submit, reveal, manual
  complete) must derive-and-append afterward.
- App code must validate content ids against the manifest; no FK catches
  garbage.
