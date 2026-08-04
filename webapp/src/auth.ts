// Full Auth.js initialisation: edge-safe config + the Drizzle adapter.
//
// Session strategy is JWT, so `sessions` rows are never written — the table exists only because
// the adapter's type contract expects it (docs/wiki/webapp-data-model.md). The adapter is still
// needed: it creates the `users` and `accounts` rows that every activity table points at.
//
// `verification_tokens` is intentionally absent. It backs email/magic-link sign-in, which this app
// does not offer, so no code path ever touches it.

import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { authConfig } from "@/auth.config";
import { db } from "@/db";
import { accounts, sessions, users } from "@/db/schema";
import { canSignIn } from "@/lib/access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
  }),
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Overrides the edge-safe domain-only check with one that also consults the database.
     *
     * This runs in the Node runtime, so it can see `revoked_at`. Stopping a revoked user here
     * means they never get a session at all — without it they would sign in successfully, be
     * bounced by the per-request check, and be able to repeat that forever.
     */
    async signIn({ user, profile }) {
      const email = profile?.email ?? user?.email;
      return canSignIn(email);
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
