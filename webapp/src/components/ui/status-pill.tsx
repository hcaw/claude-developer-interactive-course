import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

// Base recipe vendored from Stackdrop UI 0.1.0 StatusPill. Kit tones: default, run→active,
// rev→muted. `danger` is a course-app extension for wrong/error/revoked states, built from
// the kit's destructive family (recorded in the design-system ADR).
const statusPillVariants = cva(
  "inline-block border px-[7px] py-[2px] font-mono text-[9px] uppercase tracking-[0.06em]",
  {
    variants: {
      tone: {
        default: "border-border text-ink-2",
        /** Amber signal: complete / passed / in-progress-now. */
        active: "border-primary bg-accent-tint text-accent-text",
        muted: "border-border text-muted-foreground",
        danger: "border-destructive/40 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export type StatusPillProps = React.ComponentProps<"span"> & VariantProps<typeof statusPillVariants>;

export function StatusPill({ tone, className, ...rest }: StatusPillProps) {
  return <span className={cn(statusPillVariants({ tone, className }))} {...rest} />;
}
