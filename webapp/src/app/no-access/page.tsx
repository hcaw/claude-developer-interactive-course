// Dead end for revoked users.
//
// Deliberately not /login: sending them there would bounce straight back through Google, mint a
// session, fail the check again, and loop. Their progress is intact — access can be restored from
// /admin without losing anything.

import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { getSessionState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const state = await getSessionState();

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Access removed</h1>
      <p className="mt-3 text-muted-foreground">
        {state.status === "revoked" ? (
          <>
            <span className="font-mono text-ink-2">{state.email}</span> no longer has access to
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
        <Button type="submit" variant="outline" size="lg">
          Sign out
        </Button>
      </form>
    </div>
  );
}
