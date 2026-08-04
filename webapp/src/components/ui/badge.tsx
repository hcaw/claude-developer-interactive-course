import { cn } from "@/lib/cn";

// Vendored from Stackdrop UI 0.1.0 Badge: mono uppercase label with the amber square dot.
export function Badge({ children, className, ...rest }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border border-border bg-card px-3 py-[7px] font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2",
        className,
      )}
      {...rest}
    >
      <span aria-hidden className="size-[7px] bg-primary" />
      {children}
    </span>
  );
}
