# Move per-person access and admin rights into the database

Date: 2026-08-04
Status: Accepted; the `BOOTSTRAP_ADMIN_EMAILS` env bootstrap is removed by
[2026-08-04-10](2026-08-04-10-remove-env-admin-bootstrap.md). Everything else
(domain rule in env, `users.is_admin` / `users.revoked_at`, `access_events`,
the `/admin` UI) still stands.
Supersedes: the access-control half of
[2026-08-01-05](2026-08-01-05-google-auth-jwt-env-allowlist.md) —
`ALLOWED_EMAILS` and `ADMIN_EMAILS`. The rest of that ADR (Google-only
provider, JWT sessions, Drizzle adapter for identity rows, no self-signup)
still stands.

## Decision

Access control splits by rate of change:

- **Env keeps `ALLOWED_EMAIL_DOMAINS`** (and `ALLOWED_EMAILS` for individual
  exceptions like contractors). This is the organisational boundary — it
  changes approximately never and is edge-safe, so the proxy and the Auth.js
  `signIn` callback can apply it with no database.
- **The database gains `users.is_admin` and `users.revoked_at`**, plus an
  append-only `access_events` table recording who changed whose access and
  when. Anyone inside the domain is auto-provisioned on first sign-in.
- **`BOOTSTRAP_ADMIN_EMAILS`** stays in env and is always unioned with the DB
  flag, so an empty table or a bad revoke can never lock everyone out.
- Admins manage people from `/admin`.

## Context

ADR-05 rejected a DB-backed check partly on the grounds that an env list
"covers contractors/personal accounts **without redeploys**". That is false on
Vercel: environment variable changes only take effect on a new deployment. So
adding one teammate or promoting one admin meant redeploying the whole app —
the chosen option did not deliver the benefit it was chosen for. The owner
raised this directly.

Two further problems with env as the home for this: there is no audit trail of
who granted access and when, and only people with Vercel access can change it.

ADR-05's other objection — "a DB read per request in middleware is the worst
pattern" — no longer applies. The real authorization gate is
`src/lib/session.ts` in the Node runtime, not the edge proxy (Next.js 16's
`proxy.ts` is documented as optimistic checks only), and pages there already
query the database for progress. For ~20 users an indexed lookup on `users` is
noise.

## Alternatives rejected

- **Everything in the DB, including domains** — consistent, but reintroduces a
  bootstrap problem and puts the self-signup gate behind a database read, so a
  DB outage becomes an open door rather than a closed one.
- **Explicit invite-only allowlist** — every user pre-added by an admin. More
  control and a full grant record, but ~20 people would need seeding before
  launch for an internal course where a Workspace domain already establishes
  identity.
- **Roles/permissions table** — premature. There are exactly two states
  (member, admin) and no sign of a third.
- **Caching admin state in the JWT** — avoids the per-request read, but makes
  revocation lag by the token lifetime, which is the one thing revocation must
  not do.

## Consequences

- `signIn` is checked twice: `auth.config.ts` applies the domain rule (edge),
  and `auth.ts` overrides it with a DB-aware version that also rejects revoked
  users. Without the second check a revoked user could mint a session, be
  bounced by the per-request check, and repeat forever.
- `getSessionState()` returns three outcomes, not two: anonymous, revoked, ok.
  Revoked users go to `/no-access`, not `/login` — sending them to `/login`
  would loop them back through Google indefinitely.
- Revoking sets a timestamp; it never deletes the user. Progress is retained
  and access can be restored, consistent with
  [2026-08-01-06](2026-08-01-06-activity-only-data-model-derived-completion.md).
- `/admin` refuses to remove the last active admin or to let an admin revoke
  themselves. `BOOTSTRAP_ADMIN_EMAILS` rows are shown as env-managed and are
  not editable in the UI, because env wins on every request anyway.
- Server actions re-check admin rights themselves; they are addressable
  endpoints, so being rendered on an admin-only page is not authorization.
- `access_events.actor_id` is `ON DELETE SET NULL` while `user_id` cascades —
  history survives the actor being removed, but disappears with its subject.
