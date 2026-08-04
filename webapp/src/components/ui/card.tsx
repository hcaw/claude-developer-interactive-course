import { cn } from "@/lib/cn";

// Stackdrop cards: borders define structure, never elevation. Zero radius, no shadow.
// Emphasis is hover:border-line-strong, not lift.

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("border border-border bg-card text-card-foreground", className)} {...props} />;
}

/** List container for row collections (dashboard modules, section lists). */
export function ListCard({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("divide-y divide-border border border-border bg-card", className)} {...props} />;
}
