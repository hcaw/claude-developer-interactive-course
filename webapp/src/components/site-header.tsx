import Link from "next/link";

import { signOut } from "@/auth";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  // Renders signed-out on /login, where there is no user yet.
  const user = await getCurrentUser();

  return (
    <header className="border-b border-slate-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-semibold text-slate-100 hover:text-white">
          Claude Developer Course
        </Link>

        {user && (
          <div className="flex items-center gap-4 text-sm">
            {user.isAdmin && (
              <Link href="/admin" className="text-slate-400 hover:text-slate-200">
                Progress
              </Link>
            )}
            <span className="hidden text-slate-500 sm:inline">{user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="text-slate-400 hover:text-slate-200">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
