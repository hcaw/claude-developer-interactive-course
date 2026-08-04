// Edge-safe Auth.js configuration.
//
// MUST NOT import the Drizzle adapter, `pg`, or anything that reaches the database. This module is
// pulled into the proxy (formerly middleware), which runs on the edge runtime where TCP sockets do
// not exist. The full config with the adapter lives in auth.ts.

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { isAllowedDomain } from "@/lib/allowlist";

export const authConfig = {
  providers: [Google],
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * The domain gate. Only the env rule lives here — this config is loaded by the edge proxy,
     * where `pg` cannot run, so per-person revocation is checked in auth.ts (which overrides this
     * callback) and in src/lib/session.ts on every request.
     */
    signIn({ user, profile }) {
      return isAllowedDomain(profile?.email ?? user?.email);
    },

    /** Re-run on every request that carries a token, so losing the domain bites immediately. */
    jwt({ token, user }) {
      if (user) token.id = user.id;
      if (!isAllowedDomain(token.email)) return null;
      return token;
    },

    session({ session, token }) {
      if (token.id) session.user.id = String(token.id);
      return session;
    },

    /** Used by the proxy: an optimistic check only. Real authorization is src/lib/session.ts. */
    authorized({ auth }) {
      return isAllowedDomain(auth?.user?.email);
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
