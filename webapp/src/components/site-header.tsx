import Link from "next/link";

import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  // Renders signed-out on /login, where there is no user yet.
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-(--shell-max) items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          {/* The brand mark: hard amber square, ink "S" (guidelines/brand/logo.md — never
              rounded, never recolored). */}
          <span
            aria-hidden
            className="flex size-6.5 items-center justify-center bg-primary font-heading text-sm font-bold text-primary-foreground"
          >
            S
          </span>
          <span className="font-heading text-sm font-bold uppercase tracking-[0.04em] text-foreground">
            Claude Developer Course
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <>
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  Admin
                </Link>
              )}
              <span className="mono-label hidden sm:inline">{user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                  Sign out
                </Button>
              </form>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
