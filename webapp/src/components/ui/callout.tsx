import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

// Stackdrop-language callouts: hairline boxes, mono uppercase label, amber (not blue) as the
// info accent. `empty` replaces the old dashed empty-state boxes.
const calloutVariants = cva("border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-border border-l-2 border-l-primary bg-accent-tint/40 text-foreground",
      disclaimer: "border-border bg-muted text-muted-foreground",
      error: "border-destructive/40 bg-destructive/10 text-destructive",
      empty: "border-dashed border-line-strong text-ink-4",
    },
  },
  defaultVariants: { variant: "info" },
});

export type CalloutProps = React.ComponentProps<"div"> &
  VariantProps<typeof calloutVariants> & {
    label?: string;
    /** Element to render as — e.g. "aside" for content callouts. */
    as?: "div" | "aside" | "section";
  };

export function Callout({ variant, label, className, children, as: Comp = "div", ...rest }: CalloutProps) {
  return (
    <Comp className={cn(calloutVariants({ variant, className }))} {...rest}>
      {label && (
        <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-widest">{label}</p>
      )}
      {children}
    </Comp>
  );
}
