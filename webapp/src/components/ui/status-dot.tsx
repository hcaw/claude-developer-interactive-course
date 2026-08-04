import { cn } from "@/lib/cn";

// Course progress states mapped to the Stackdrop signal language (strict amber — the palette
// has no green; see the design-system ADR):
//   complete → solid amber, partial → translucent amber tint, none → faint hairline ink.
// Square, like the Badge dot — the kit has no circles.
const STATE_CLASSES = {
  complete: "bg-primary",
  partial: "border border-primary/40 bg-accent-tint",
  none: "bg-line-strong",
} as const;

const STATE_LABELS = {
  complete: "Complete",
  partial: "In progress",
  none: "Not started",
} as const;

export type StatusDotState = keyof typeof STATE_CLASSES;

export function StatusDot({
  state,
  className,
  ...rest
}: React.ComponentProps<"span"> & { state: StatusDotState }) {
  return (
    <>
      <span
        aria-hidden
        className={cn("size-[7px] shrink-0", STATE_CLASSES[state], className)}
        {...rest}
      />
      {/* The dot is decorative; the state must also exist as text for screen readers. */}
      <span className="sr-only">{STATE_LABELS[state]}</span>
    </>
  );
}
