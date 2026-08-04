// Access control: who may sign in, who is an admin, and how that changes.
//
// Split by rate of change (adr/2026-08-04-08, adr/2026-08-04-10):
//
//   ENV  ALLOWED_EMAIL_DOMAINS   which organisation this deployment serves. Changes ~never, and
//                                it is the outer bound that keeps "no self-signup" true before any
//                                DB read happens.
//   DB   users.is_admin          who can see /admin. Changes as people join and take on the course.
//   DB   users.revoked_at        offboarding. Changes as people leave.
//
// The env allowlist previously carried the last two. It was the wrong home: on Vercel an env var
// change only takes effect on redeploy, so adding a teammate meant redeploying the app, and there
// was no record of who granted what. Admin rights are now DB-only — there is no env override left
// (adr/2026-08-04-10). Bootstrap and break-glass are `npm run admin:grant`, which writes the same
// row and the same audit event the UI does.

import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { accessEvents, users } from "@/db/schema";
import { isAllowedDomain } from "@/lib/allowlist";

export type AccessRecord = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  revokedAt: Date | null;
};

/** The stored access state for an email, or null if they have never signed in. */
export async function getAccessRecord(email: string): Promise<AccessRecord | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      isAdmin: users.isAdmin,
      revokedAt: users.revokedAt,
    })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return row ?? null;
}

/**
 * Whether an email may hold a session at all.
 *
 * Domain first (cheap, no DB), then the revocation check. A user who has never signed in has no
 * row yet and is allowed — the domain is what provisions them.
 */
export async function canSignIn(email: string | null | undefined): Promise<boolean> {
  if (!isAllowedDomain(email)) return false;
  const record = await getAccessRecord(email!);
  return record === null || record.revokedAt === null;
}

export function isAdminRecord(record: AccessRecord | null): boolean {
  return record !== null && record.isAdmin && record.revokedAt === null;
}

// --- mutations (admin only; callers must have already checked) --------------

async function record(
  userId: string,
  action: "granted_admin" | "revoked_admin" | "revoked_access" | "restored_access",
  actorId: string | null
) {
  await db.insert(accessEvents).values({ userId, action, actorId });
}

export async function setAdmin(userId: string, makeAdmin: boolean, actorId: string): Promise<void> {
  await db.update(users).set({ isAdmin: makeAdmin }).where(eq(users.id, userId));
  await record(userId, makeAdmin ? "granted_admin" : "revoked_admin", actorId);
}

export async function setRevoked(userId: string, revoke: boolean, actorId: string): Promise<void> {
  await db
    .update(users)
    .set({ revokedAt: revoke ? new Date() : null })
    .where(eq(users.id, userId));
  await record(userId, revoke ? "revoked_access" : "restored_access", actorId);
}

/** Everyone who has ever signed in, with their access state. Admin view. */
export async function listPeople(): Promise<AccessRecord[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      isAdmin: users.isAdmin,
      revokedAt: users.revokedAt,
    })
    .from(users)
    .orderBy(users.email);
}

/** Recent access changes, newest first. Small table; the cap is just to keep the page short. */
export async function recentAccessEvents(limit = 50) {
  return db
    .select({
      id: accessEvents.id,
      userId: accessEvents.userId,
      action: accessEvents.action,
      actorId: accessEvents.actorId,
      createdAt: accessEvents.createdAt,
    })
    .from(accessEvents)
    .orderBy(desc(accessEvents.createdAt))
    .limit(limit);
}

/** Count of admins who still have access, used to refuse removing the last one. */
export async function activeAdminCount(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.isAdmin, true), isNull(users.revokedAt)));
  return row?.n ?? 0;
}
