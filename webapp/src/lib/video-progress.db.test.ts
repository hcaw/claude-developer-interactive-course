// Integration tests for the video-progress upsert. Requires a real Postgres.
//
//   createdb course_app_test
//   psql -v ON_ERROR_STOP=1 course_app_test -f drizzle/0000_*.sql
//   TEST_DATABASE_URL=postgres://localhost/course_app_test npm run test:db
//
// Kept out of `npm test` because it needs a database. What it proves cannot be proven in a unit
// test: that GREATEST and the completed_at CASE behave correctly in Postgres itself, including
// under out-of-order heartbeats.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { and, eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { completionEvents, users, videoProgress } from "../db/schema.ts";
import { upsertVideoProgress } from "./video-progress.ts";

const url = process.env.TEST_DATABASE_URL;

describe("video progress upsert", { skip: url ? false : "set TEST_DATABASE_URL" }, () => {
  let pool: Pool;
  let db: NodePgDatabase<Record<string, unknown>>;
  let userId: string;

  const VIDEO = "m1-01-orientation";
  const read = async () =>
    (
      await db
        .select()
        .from(videoProgress)
        .where(and(eq(videoProgress.userId, userId), eq(videoProgress.videoId, VIDEO)))
    )[0];

  before(async () => {
    pool = new Pool({ connectionString: url });
    db = drizzle(pool);
    const [row] = await db
      .insert(users)
      .values({ email: `test-${Date.now()}@example.com`, name: "Test" })
      .returning({ id: users.id });
    userId = row.id;
  });

  after(async () => {
    if (userId) await db.delete(users).where(eq(users.id, userId)); // cascades
    await pool?.end();
  });

  test("first heartbeat inserts and does not complete at 50%", async () => {
    await upsertVideoProgress(db, { userId, videoId: VIDEO, position: 50, duration: 100 });
    const row = await read();
    assert.equal(row.positionSeconds, 50);
    assert.equal(row.maxPositionSeconds, 50);
    assert.equal(row.durationSeconds, 100);
    assert.equal(row.completedAt, null);
  });

  test("seeking backwards moves the resume point but not the high-water mark", async () => {
    await upsertVideoProgress(db, { userId, videoId: VIDEO, position: 10, duration: 100 });
    const row = await read();
    assert.equal(row.positionSeconds, 10, "resume follows the user");
    assert.equal(row.maxPositionSeconds, 50, "high-water mark must not retreat");
    assert.equal(row.completedAt, null);
  });

  test("crossing 90% sets completed_at", async () => {
    await upsertVideoProgress(db, { userId, videoId: VIDEO, position: 91, duration: 100 });
    const row = await read();
    assert.equal(row.maxPositionSeconds, 91);
    assert.notEqual(row.completedAt, null, "should complete at >= 90%");
  });

  test("a late, stale beacon cannot un-complete or rewind", async () => {
    // The real scenario: pagehide fires a beacon with an old position that lands after the
    // heartbeat which completed the video.
    const before = await read();
    await upsertVideoProgress(db, { userId, videoId: VIDEO, position: 5, duration: 100 });
    const row = await read();
    assert.equal(row.maxPositionSeconds, 91, "high-water mark preserved");
    assert.deepEqual(row.completedAt, before.completedAt, "completion timestamp frozen");
    assert.equal(row.positionSeconds, 5);
  });

  test("a heartbeat with unknown duration keeps the stored one", async () => {
    await upsertVideoProgress(db, { userId, videoId: VIDEO, position: 60, duration: null });
    const row = await read();
    assert.equal(row.durationSeconds, 100, "null duration must not wipe the known value");
    assert.notEqual(row.completedAt, null);
  });

  test("89.9% does not complete a fresh video", async () => {
    const other = "m1-02-how-llms-behave";
    await upsertVideoProgress(db, { userId, videoId: other, position: 89.9, duration: 100 });
    const [row] = await db
      .select()
      .from(videoProgress)
      .where(and(eq(videoProgress.userId, userId), eq(videoProgress.videoId, other)));
    assert.equal(row.completedAt, null);

    await upsertVideoProgress(db, { userId, videoId: other, position: 90, duration: 100 });
    const [after] = await db
      .select()
      .from(videoProgress)
      .where(and(eq(videoProgress.userId, userId), eq(videoProgress.videoId, other)));
    assert.notEqual(after.completedAt, null, "exactly 90% completes");
  });

  test("completion_events appends are idempotent under repeats", async () => {
    const rows = Array.from({ length: 3 }, () => ({
      userId,
      itemType: "section" as const,
      itemId: "m1-01-orientation",
    }));
    // Simulates three racing heartbeats all deriving the same new completion.
    for (const r of rows) await db.insert(completionEvents).values(r).onConflictDoNothing();

    const stored = await db
      .select()
      .from(completionEvents)
      .where(eq(completionEvents.userId, userId));
    assert.equal(stored.length, 1, "the unique constraint collapses duplicates");
  });

  test("item_type is constrained to section or module", async () => {
    // Drizzle wraps driver errors, so the constraint name lands on `cause`, not `message`.
    await assert.rejects(
      db.insert(completionEvents).values({
        userId,
        itemType: "bogus" as unknown as "section",
        itemId: "x",
      }),
      (err: Error & { cause?: { constraint?: string } }) => {
        assert.equal(err.cause?.constraint, "completion_events_item_type_check");
        return true;
      }
    );
  });
});
