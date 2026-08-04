// Dead end for revoked users.
//
// Deliberately not /login: sending them there would bounce straight back through Google, mint a
// session, fail the check again, and loop. Their progress is intact — access can be restored from
// /admin without losing anything.

import { signOut } from "@/auth";
import { getSessionState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const state = await getSessionState();

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-100">Access removed</h1>
      <p className="mt-3 text-slate-400">
        {state.status === "revoked" ? (
          <>
            <span className="font-mono text-slate-300">{state.email}</span> no longer has access to
            this course. Ask an admin if you think this is a mistake.
          </>
        ) : (
          <>You don&apos;t have access to this course.</>
        )}
      </p>

      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
