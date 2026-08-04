"use server";

// Server actions behind /admin.
//
// Each one re-checks admin rights itself. Being reachable only from an admin page is not
// authorization — server actions are addressable endpoints, so anyone who knows the action id
// could invoke them.

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { activeAdminCount, setAdmin, setRevoked } from "@/lib/access";
import { requireAdmin } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function findById(userId: string) {
  const [row] = await db
    .select({ id: users.id, isAdmin: users.isAdmin, revokedAt: users.revokedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Guard against emptying the admin list. Since adr/2026-08-04-10 there is no env override left, so
 * this is the only thing standing between a mis-click and an admin-less deployment — the recovery
 * is `npm run admin:grant`, which needs database access.
 */
async function wouldStrandAdmins(userId: string): Promise<boolean> {
  const [target, admins] = await Promise.all([findById(userId), activeAdminCount()]);
  return !!target?.isAdmin && !target.revokedAt && admins <= 1;
}

export async function promoteAction(userId: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  await setAdmin(userId, true, actor.id);
  revalidatePath("/admin");
  return { ok: true };
}

export async function demoteAction(userId: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (await wouldStrandAdmins(userId)) {
    return { ok: false, error: "That's the last admin — promote someone else first." };
  }
  await setAdmin(userId, false, actor.id);
  revalidatePath("/admin");
  return { ok: true };
}

export async function revokeAction(userId: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (userId === actor.id) {
    return { ok: false, error: "You can't revoke your own access." };
  }
  if (await wouldStrandAdmins(userId)) {
    return { ok: false, error: "That's the last admin — promote someone else first." };
  }
  await setRevoked(userId, true, actor.id);
  revalidatePath("/admin");
  return { ok: true };
}

export async function restoreAction(userId: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  await setRevoked(userId, false, actor.id);
  revalidatePath("/admin");
  return { ok: true };
}
