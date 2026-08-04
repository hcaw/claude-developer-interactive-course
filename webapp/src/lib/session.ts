// Server-side session access. The real authorization gate.
//
// The proxy does an optimistic redirect; these helpers decide whether a request may read or write.
// Every page and API route calls one of them, so both the domain rule and the database access
// state are re-checked per request (adr/2026-08-01-05, adr/2026-08-04-08).

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getAccessRecord, isAdminRecord } from "@/lib/access";
import { isAllowedDomain } from "@/lib/allowlist";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
};

/**
 * Three outcomes, not two.
 *
 * "Revoked" must be distinguishable from "signed out": sending a revoked user to /login would
 * bounce them straight back through Google, mint a session, fail the check again, and loop. They
 * get a dead end that says so instead.
 */
export type SessionState =
  | { status: "anonymous" }
  | { status: "revoked"; email: string }
  | { status: "ok"; user: CurrentUser };

export async function getSessionState(): Promise<SessionState> {
  const session = await auth();
  const email = session?.user?.email;
  const id = session?.user?.id;
  if (!id || !email) return { status: "anonymous" };

  // Domain removal still logs someone out rather than showing a dead end — losing the domain means
  // this deployment is not for them at all.
  if (!isAllowedDomain(email)) return { status: "anonymous" };

  const record = await getAccessRecord(email);
  if (record?.revokedAt) return { status: "revoked", email };

  return {
    status: "ok",
    user: {
      id: record?.id ?? id,
      email,
      name: record?.name ?? session.user.name ?? null,
      image: record?.image ?? session.user.image ?? null,
      isAdmin: isAdminRecord(record, email),
    },
  };
}

/** The signed-in, still-permitted user, or null. Never throws, never redirects. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const state = await getSessionState();
  return state.status === "ok" ? state.user : null;
}

/** For pages: /login when signed out, /no-access when revoked. */
export async function requireUser(): Promise<CurrentUser> {
  const state = await getSessionState();
  if (state.status === "revoked") redirect("/no-access");
  if (state.status === "anonymous") redirect("/login");
  return state.user;
}

/** For pages: 404-ish behaviour for non-admins — don't advertise that /admin exists. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

/** For API routes: null means "reply 401", with no redirect. */
export async function requireApiUser(): Promise<CurrentUser | null> {
  return getCurrentUser();
}
