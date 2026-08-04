---
kind: system
---

# Webapp Data Model

Last verified: 2026-08-01 against main (design of record — schema not yet migrated; see [status.md](status.md))

All tables live in Postgres schema `course_app` on the existing RDS instance, authored via Drizzle `pgSchema('course_app')`. The DB stores **user activity only** — content ids are strings validated against the static manifest in app code; there are no content tables and no FKs to content. Rationale and rejected alternatives: [adr/2026-08-01-06](../adr/2026-08-01-06-activity-only-data-model-derived-completion.md).

## Identity (Auth.js Drizzle adapter, standard shapes)

```sql
CREATE TABLE course_app.users (
  id             text PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text,
  email          text NOT NULL UNIQUE,
  email_verified timestamptz,
  image          text,
  -- access control (adr/2026-08-04-08); current state here, audit trail in access_events
  is_admin       boolean NOT NULL DEFAULT false,
  revoked_at     timestamptz          -- NULL = active. Offboarding never deletes the user.
);
CREATE TABLE course_app.accounts (      -- Google OAuth link
  user_id text NOT NULL REFERENCES course_app.users(id) ON DELETE CASCADE,
  type text NOT NULL, provider text NOT NULL, provider_account_id text NOT NULL,
  refresh_token text, access_token text, expires_at integer,
  token_type text, scope text, id_token text, session_state text,
  PRIMARY KEY (provider, provider_account_id)
);
CREATE TABLE course_app.sessions (      -- required by adapter; UNUSED under JWT strategy
  session_token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES course_app.users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);
```

```sql
CREATE TABLE course_app.access_events (  -- append-only; never update or delete
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    text NOT NULL REFERENCES course_app.users(id) ON DELETE CASCADE,
  action     text NOT NULL CHECK (action IN
               ('granted_admin','revoked_admin','revoked_access','restored_access')),
  actor_id   text REFERENCES course_app.users(id) ON DELETE SET NULL,  -- NULL = system/env
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_events_user_idx ON course_app.access_events (user_id, created_at DESC);
```

User rows are retained forever; offboarding sets `revoked_at`, never deletes. Progress survives, so
access can be restored without loss. `actor_id` is `SET NULL` rather than cascading, so history
outlives the person who made the change.

**Who may sign in** ([adr/2026-08-04-08](../adr/2026-08-04-08-db-backed-access-control.md)): the env
domain rule (`ALLOWED_EMAIL_DOMAINS` / `ALLOWED_EMAILS`) is the outer boundary and auto-provisions a
user row on first sign-in; `revoked_at` blocks an individual; `is_admin` (unioned with
`BOOTSTRAP_ADMIN_EMAILS` from env) grants `/admin`. All of it is re-checked per request in
`src/lib/session.ts`.

## Activity primitives

```sql
CREATE TABLE course_app.video_progress (
  user_id              text NOT NULL REFERENCES course_app.users(id) ON DELETE CASCADE,
  video_id             text NOT NULL,        -- mp4 basename, e.g. 'm1-02-how-llms-behave'
  position_seconds     real NOT NULL DEFAULT 0,   -- resume point (last known)
  max_position_seconds real NOT NULL DEFAULT 0,   -- monotonic high-water mark
  duration_seconds     real,
  completed_at         timestamptz,          -- set server-side when max/duration >= 0.9
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE course_app.quiz_attempts (      -- append-only
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     text NOT NULL REFERENCES course_app.users(id) ON DELETE CASCADE,
  section_id  text NOT NULL,                 -- 'm1-06-module-wrap-up'
  article_key text NOT NULL,                 -- manifest article key (source file path)
  answers     jsonb NOT NULL,                -- positional letters: ["B","C","B","C"]
  score       smallint NOT NULL,
  total       smallint NOT NULL,
  passed      boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_attempts_user_article_idx
  ON course_app.quiz_attempts (user_id, article_key, created_at DESC);

CREATE TABLE course_app.manual_completions ( -- free-form reveals + videoless sections
  user_id      text NOT NULL REFERENCES course_app.users(id) ON DELETE CASCADE,
  item_key     text NOT NULL,  -- article_key (reveal) OR bare sectionId (videoless section)
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_key)
);

CREATE TABLE course_app.completion_events (  -- append-only reporting log; never update/delete
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id   text NOT NULL REFERENCES course_app.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('section', 'module')),
  item_id   text NOT NULL,                   -- sectionId or module number as text
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);
```

Keys are single-course by decision; a second course requires the `course_id` migration described in [adr/2026-08-01-06](../adr/2026-08-01-06-activity-only-data-model-derived-completion.md).

## Completion derivation (source of truth: `webapp/src/lib/progress.ts`)

A pure function over (manifest, activity rows). Constants: video completion at **≥90%** of duration via the high-water mark; quiz pass at **score ≥ ceil(0.7 × total)** (`QUIZ_PASS_THRESHOLD = 0.7` — all-correct for 1–2 question checkpoints, 3/4 for the module quiz). Best attempt counts.

A **section** is complete iff every requirement it *has* is met:
1. Main video (if the section has one): `video_progress.completed_at` set.
2. Every gradeable quiz article: some attempt with `passed = true`.
3. Every free-form assessment article: a `manual_completions` row for its `article_key`.
4. Sections with *no* requirements at all (`m3-09-module-complete`, `m4-09-module-complete`): a `manual_completions` row with `item_key = sectionId` (the "Mark complete" button).

Debrief videos are tracked in `video_progress` for resume but are **never** a completion requirement. A **module** is complete iff all its sections are complete (checkpoint passes are folded into section completion). Which sections have which requirements: [course-content-inventory.md](course-content-inventory.md).

**Transition snapshots**: after any write that could flip a completion (heartbeat, quiz submit, reveal, manual complete), re-derive the affected user's section + module state; on false→true, append a `completion_events` row. The UI always derives live; `completion_events` exists for reporting/history only (the `UNIQUE` constraint makes the append idempotent under races). SQL reporting reads events; it never re-implements derivation.

## API route → table write map

| Route (POST) | Validates against manifest | Writes |
|---|---|---|
| `/api/progress/heartbeat` | `video_id` exists | upsert `video_progress` (`max_position_seconds = GREATEST(old, new)`; sets `completed_at` at ≥90%) → derive → `completion_events` |
| `/api/quiz/submit` | `article_key` is gradeable; answers length | insert `quiz_attempts` → derive → `completion_events` |
| `/api/assessment/reveal` | `article_key` is free-form | upsert `manual_completions` → derive → `completion_events` |
| `/api/progress/complete` | `item_key` is a zero-requirement sectionId | upsert `manual_completions` → derive → `completion_events` |

Reads: dashboard/section pages select the current user's rows; `/admin` (RSC) selects all users' rows (best attempt via `DISTINCT ON (user_id, article_key) … ORDER BY score DESC`) and runs the same derivation function.
