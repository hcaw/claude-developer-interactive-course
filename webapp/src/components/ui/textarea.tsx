import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Free-text input for self-assessed checkpoints. Not in the Stackdrop UI kit — added here as a
 * minimal token-only primitive; deviation recorded in adr/2026-08-04-12.
 *
 * Mono type on purpose: every free-text checkpoint asks for code, config, or structured
 * "layer: sentence" answers, not prose.
 */
export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-none border border-border bg-transparent p-3 font-mono text-sm leading-6 text-ink-2",
        "placeholder:text-ink-4 focus-visible:border-line-strong focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
