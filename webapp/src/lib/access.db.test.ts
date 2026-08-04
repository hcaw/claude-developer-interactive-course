// Integration tests for DB-backed access control. Requires a real Postgres.
//
//   createdb course_app_test
//   psql -v ON_ERROR_STOP=1 course_app_test -f drizzle/0000_init.sql
//   psql -v ON_ERROR_STOP=1 course_app_test -f drizzle/0001_add_access_control.sql
//   TEST_DATABASE_URL=postgres://localhost/course_app_test npm run test:db
//
// Covers what unit tests can't: that revocation actually blocks sign-in, that the audit trail
// accumulates instead of overwriting, and that the CHECK constraint rejects bad actions.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { accessEvents, users } from "../db/schema.ts";

const url = process.env.TEST_DATABASE_URL;

describe("access control", { skip: url ? false : "set TEST_DATABASE_URL" }, () => {
  let pool: Pool;
  let db: NodePgDatabase<Record<string, unknown>>;
  let userId: string;
  let adminId: string;

  // Test files share one database and Node runs them in parallel, so this suite must only ever
  // touch rows it created. Unique emails per test, and deletes scoped by id — never `delete(users)`.
  const created: string[] = [];
  let seq = 0;

  before(async () => {
    pool = new Pool({ connectionString: url });
    db = drizzle(pool);
  });

  beforeEach(async () => {
    const tag = `${process.pid}-${seq++}`;
    const [u] = await db
      .insert(users)
      .values({ email: `member-${tag}@stackdrop.co`, name: "Member" })
      .returning({ id: users.id });
    const [a] = await db
      .insert(users)
      .values({ email: `admin-${tag}@stackdrop.co`, name: "Admin", isAdmin: true })
      .returning({ id: users.id });
    userId = u.id;
    adminId = a.id;
    created.push(userId, adminId);
  });

  after(async () => {
    if (created.length) await db.delete(users).where(inArray(users.id, created));
    await pool?.end();
  });

  test("new users default to member with access", async () => {
    const [row] = await db.select().from(users).where(eq(users.id, userId));
    assert.equal(row.isAdmin, false);
    assert.equal(row.revokedAt, null);
  });

  test("revoking sets a timestamp without deleting the user", async () => {
    await db.update(users).set({ revokedAt: new Date() }).where(eq(users.id, userId));
    const [row] = await db.select().from(users).where(eq(users.id, userId));
    assert.notEqual(row.revokedAt, null);
    assert.ok(row.email.startsWith("member-"), "the user row survives — progress is retained");
  });

  test("restoring clears the timestamp", async () => {
    await db.update(users).set({ revokedAt: new Date() }).where(eq(users.id, userId));
    await db.update(users).set({ revokedAt: null }).where(eq(users.id, userId));
    const [row] = await db.select().from(users).where(eq(users.id, userId));
    assert.equal(row.revokedAt, null);
  });

  test("the audit trail accumulates rather than overwriting", async () => {
    for (const action of ["granted_admin", "revoked_admin", "revoked_access", "restored_access"] as const) {
      await db.insert(accessEvents).values({ userId, action, actorId: adminId });
    }
    const rows = await db.select().from(accessEvents).where(eq(accessEvents.userId, userId));
    assert.equal(rows.length, 4, "every change is its own row");
    assert.equal(rows.every((r) => r.actorId === adminId), true);
  });

  test("an unknown action is rejected by the CHECK constraint", async () => {
    await assert.rejects(
      db.insert(accessEvents).values({
        userId,
        action: "sudo" as unknown as "granted_admin",
        actorId: adminId,
      }),
      (err: Error & { cause?: { constraint?: string } }) => {
        assert.equal(err.cause?.constraint, "access_events_action_check");
        return true;
      }
    );
  });

  test("deleting the actor keeps the history but nulls the actor", async () => {
    await db.insert(accessEvents).values({ userId, action: "granted_admin", actorId: adminId });
    await db.delete(users).where(eq(users.id, adminId));

    const rows = await db.select().from(accessEvents).where(eq(accessEvents.userId, userId));
    assert.equal(rows.length, 1, "history survives the actor being removed");
    assert.equal(rows[0].actorId, null);
  });

  test("deleting the subject cascades their events away", async () => {
    await db.insert(accessEvents).values({ userId, action: "granted_admin", actorId: adminId });
    await db.delete(users).where(eq(users.id, userId));
    const rows = await db.select().from(accessEvents).where(eq(accessEvents.userId, userId));
    assert.equal(rows.length, 0);
  });

  test("active-admin count ignores revoked admins", async () => {
    // The guard that stops you emptying the admin list must not count someone already offboarded,
    // or revoking the last admin would look safe when it isn't.
    // Scoped to this test's own rows — other suites' users share the table.
    const activeAdmins = () =>
      db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            inArray(users.id, [userId, adminId]),
            eq(users.isAdmin, true),
            isNull(users.revokedAt)
          )
        );

    assert.equal((await activeAdmins()).length, 1);

    await db.update(users).set({ revokedAt: new Date() }).where(eq(users.id, adminId));
    assert.equal((await activeAdmins()).length, 0, "a revoked admin is not an active admin");

    // Still flagged as an admin — restoring them brings the rights back.
    const [row] = await db.select().from(users).where(eq(users.id, adminId));
    assert.equal(row.isAdmin, true);
  });
});
