"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

// Kit pattern (SiteHeader): ghost icon button, sun shown in dark mode, moon in light.
// Icons are inline stroke SVGs (1.5 weight, currentColor) per the brand icon rules —
// no icon library.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // The theme is unknown until the client mounts; render a blank slot of the same
  // size to avoid a hydration mismatch or icon flash.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <span aria-hidden className="size-8" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className="text-muted-foreground hover:bg-transparent hover:text-primary"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* sun — visible in dark mode */}
      <svg
        className="hidden size-4 dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8" />
      </svg>
      {/* moon — visible in light mode */}
      <svg
        className="size-4 dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
      </svg>
    </Button>
  );
}
