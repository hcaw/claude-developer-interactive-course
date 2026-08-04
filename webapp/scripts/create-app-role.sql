-- Create the least-privilege role the app runs as. Run ONCE, as the database OWNER
-- (Neon: neondb_owner · RDS: the master user), never as the app role itself.
--
--   psql "$OWNER_URL" -v app_password="$(openssl rand -base64 24 | tr -d '/+=')" \
--        -f scripts/create-app-role.sql
--
-- Prints the finished DATABASE_URL at the end. Idempotent: safe to re-run (it resets the password).
--
-- Why a separate role: the app must not be able to touch anything outside course_app, so a leaked
-- app credential can't read or drop the rest of the database (adr/2026-08-01-03).
--
-- Uses psql's \gexec rather than DO blocks so it needs no plpgsql — one less thing that can be
-- missing or restricted on a managed provider.

\set ON_ERROR_STOP on

-- 1. Create the role only if it's missing...
SELECT format('CREATE ROLE course_app_user LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'course_app_user')
\gexec

-- ...then always set the password, so a re-run rotates it rather than failing.
SELECT format('ALTER ROLE course_app_user WITH LOGIN PASSWORD %L', :'app_password')
\gexec

-- 2. Let it connect to this database.
SELECT format('GRANT CONNECT ON DATABASE %I TO course_app_user', current_database())
\gexec

-- 2b. And let it create schemas.
--     Needed because the Drizzle migrator unconditionally issues `CREATE SCHEMA IF NOT EXISTS`
--     for its journal schema, and Postgres checks the privilege before the IF NOT EXISTS — so the
--     statement fails even though course_app already exists.
--
--     The alternative is running migrations as the database owner, which would leave every table
--     owned by the owner rather than the app role, and then need explicit grants on each one.
--     This keeps the app the owner of everything it uses. The privilege only permits creating new
--     schemas; `public` stays revoked below.
SELECT format('GRANT CREATE ON DATABASE %I TO course_app_user', current_database())
\gexec

-- 3. Become a member of the new role.
--    PG16 split ADMIN from SET: creating a role lets you grant it, but not SET ROLE to it, and
--    `CREATE SCHEMA ... AUTHORIZATION <role>` requires the latter. Without this the next statement
--    fails with "must be able to SET ROLE". Harmless on the owner, which already outranks it.
GRANT course_app_user TO CURRENT_USER;

-- 4. Its own schema, which it OWNS — so `drizzle-kit migrate` run as this role creates tables it
--    owns, and no later migration hits a permission error.
CREATE SCHEMA IF NOT EXISTS course_app AUTHORIZATION course_app_user;
ALTER SCHEMA course_app OWNER TO course_app_user;

-- 4. Never make it hunt for its tables.
ALTER ROLE course_app_user SET search_path = course_app;

-- 5. Keep it out of `public`.
--    Revoking from course_app_user alone is NOT enough: on PG14 and earlier, `public` grants CREATE
--    to the PUBLIC pseudo-role, and that grant is inherited by every role — so the app role could
--    still create tables there. PG15+ drops that default, but revoke explicitly so this holds on
--    any version. Safe here because the app owns this database outright.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM course_app_user;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM course_app_user;

-- 6. The line to paste into .env. Swap <HOST> for the host from your owner URL — and on Neon use
--    the POOLED host (…-pooler…) here, while running migrations against the direct host.
SELECT format(
  'DATABASE_URL=postgres://course_app_user:%s@<HOST>/%s?sslmode=require',
  :'app_password', current_database()
) AS "paste into webapp/.env";
