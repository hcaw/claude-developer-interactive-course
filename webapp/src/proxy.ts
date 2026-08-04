// Route protection.
//
// Next.js 16 renamed `middleware.ts` to `proxy.ts`; behaviour is unchanged. Next's own docs are
// explicit that this layer is for optimistic checks, not authorization — so every page and API
// route still verifies the session itself via requireUser()/requireAdmin()/requireApiUser() in
// src/lib/session.ts, which is also where DB-backed revocation is checked.
//
// It imports auth.config (edge-safe) rather than auth.ts, which would drag `pg` into the edge
// runtime.

import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { isAllowedDomain } from "@/lib/allowlist";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (isAllowedDomain(req.auth?.user?.email)) return;

  // API routes must answer with 401 JSON, not a redirect. `fetch` follows redirects
  // transparently, so a 307 to /login would hand the client a 200 page of HTML — the quiz and
  // heartbeat would then fail on JSON parsing and report a vague "try again" instead of the real
  // reason. Pages still redirect, which is what a browser navigation wants.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL("/login", req.nextUrl.origin);
  url.searchParams.set("callbackUrl", req.nextUrl.href);
  return NextResponse.redirect(url);
});

export const config = {
  // Everything except Auth.js's own endpoints, the two signed-out pages, and static assets.
  // `/no-access` must be excluded or a revoked user could be bounced away from the one page that
  // explains their situation.
  matcher: ["/((?!api/auth|login|no-access|_next/static|_next/image|favicon.ico).*)"],
};
