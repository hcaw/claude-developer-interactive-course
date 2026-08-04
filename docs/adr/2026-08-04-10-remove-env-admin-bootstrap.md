# Remove the env admin bootstrap; admin rights are DB-only

Date: 2026-08-04
Status: Accepted
Supersedes: the `BOOTSTRAP_ADMIN_EMAILS` decision in
[2026-08-04-08](2026-08-04-08-db-backed-access-control.md). The rest of that
ADR (domain rule in env, `users.is_admin` / `users.revoked_at`,
`access_events`, the `/admin` management UI) still stands.

## Decision

`BOOTSTRAP_ADMIN_EMAILS` is deleted. `users.is_admin` is the only thing that
makes someone an admin; `isAdminRecord()` no longer consults env at all.

The first admin — and the break-glass if the last one is ever removed — is
`npm run admin:grant -- <email>` (`webapp/scripts/grant-admin.mjs`). It writes
the same row and the same `access_events` entry the UI writes, with
`actor_id = NULL`, which the schema already defines as "system".

## Context

ADR-08 kept a small env list as "admins of last resort", unioned with the DB
flag on every request. In practice it became the *only* way anyone was an
admin: at the point this was written, no row in `users` had `is_admin = true`,
including the owner's. The env list was silently doing all the work, and the
`/admin` People table rendered those rows as `managed in env` — un-editable,
because env won on every request regardless.

That reproduced exactly the problem ADR-08 was written to fix. Handing admin
duties to someone else, or dropping them when you leave, meant editing an
environment variable and redeploying. The owner raised this directly: admin
status is a property of a person in the system, not of the deployment.

## Alternatives rejected

- **Keep it, but stop rendering env rows as un-editable** — the smallest
  change, and the one that leaves the actual complaint in place: the row still
  can't be demoted without a redeploy.
- **Auto-promote the first user to sign in when no admin exists** — zero
  config, but it means a fully-revoked admin table silently re-grants to
  whoever loads the site next. A quiet grant is worse than a loud lockout.
- **Seed the first admin with an `INSERT` in a migration** — the shape the
  owner initially asked for, and the shape most systems use. It does not work
  here: pre-creating a `users` row for someone who has not signed in makes
  Auth.js fail their first Google sign-in with `OAuthAccountNotLinked`, because
  the adapter finds a user with that email and no linked `accounts` row. The
  fix would be `allowDangerousEmailAccountLinking`, which is a real security
  loosening to buy a one-line convenience. So the script updates an existing
  row and refuses loudly when there isn't one.

## Consequences

- **Deploying to a fresh database is a two-step sequence**: someone signs in
  (auto-provisioned as a member, sees no `/admin`), then `npm run admin:grant`
  promotes them. Recorded in the deploy runbook in `wiki/status.md`.
- **Break-glass now requires database access**, not Vercel access. That is a
  narrower group, deliberately: the guard in `src/app/admin/actions.ts` already
  refuses to remove the last active admin, so reaching this state takes a
  direct `UPDATE`.
- The grant script refuses to promote a revoked user — granting admin to
  someone who cannot hold a session is a silent no-op. Restore them in
  `/admin` first, so the restore is audited as its own event.
- `webapp/.env`, `.env.example` and the env table in `wiki/webapp-architecture.md`
  no longer mention admin at all. `ALLOWED_EMAIL_DOMAINS` is the only
  access-related variable left in env.
