# Google sign-in via Auth.js with JWT sessions and an env allowlist

Date: 2026-08-01
Status: Accepted; the access-control half (per-person allowlist in env) is
superseded by [2026-08-04-08](2026-08-04-08-db-backed-access-control.md).
The auth mechanism (Google via Auth.js, JWT sessions, domain rule) still stands.

## Decision

Authentication is Auth.js v5 with the Google provider only. Sessions use
the JWT strategy; the Drizzle adapter persists identity rows (stable user
ids for progress FKs). Access is controlled by an env allowlist
(`ALLOWED_EMAIL_DOMAINS`, `ALLOWED_EMAILS`); admins by `ADMIN_EMAILS`.
No self-signup of any kind.

## Context

Audience is the internal Stackdrop team (~20 people; decision trail:
[../stream/2026-08-01-webapp-planning.plan.md](../stream/2026-08-01-webapp-planning.plan.md)),
all with Google identities. With RDS + serverless
(2026-08-01-03-nextjs-vercel-rds-monorepo-stack), a DB read per request in
middleware is the worst pattern — JWT sessions make navigation DB-free.
Next.js middleware runs on the Edge runtime where `pg` cannot load,
forcing the Auth.js split-config pattern.

## Alternatives rejected

- **DB sessions (adapter strategy)** — an RDS round-trip on every request
  through middleware, paid by a `max: 1` connection pool.
- **Open signup / email magic links** — no external users exist; Google is
  already universal internally.
- **Hard-coded Workspace domain check** — an env-driven list of domains AND
  individual emails covers contractors/personal accounts without redeploys.

## Consequences

- Config is split: `auth.config.ts` (providers + callbacks) must stay
  edge-safe — no adapter, no `pg` imports. `auth.ts` adds the adapter.
- The `authorized` callback re-checks the allowlist on *every* request, so
  removing someone bites immediately despite long-lived JWTs. Offboarding =
  allowlist removal; user rows are retained
  (2026-08-01-06-activity-only-data-model-derived-completion).
- All routes (pages and API) sit behind the middleware matcher; only
  `/login` and `/api/auth/*` are public.
