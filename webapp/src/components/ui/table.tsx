import { cn } from "@/lib/cn";

// Stackdrop table language: bordered shell, muted header strip, mono uppercase column labels,
// hairline row rules. Cells default left-aligned text-sm.

export function TableShell({ className, children, ...rest }: React.ComponentProps<"div">) {
  return (
    <div className={cn("overflow-x-auto border border-border", className)} {...rest}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ className, ...rest }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-muted", className)} {...rest} />;
}

export function Th({ className, ...rest }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground",
        className,
      )}
      {...rest}
    />
  );
}

export function Tr({ className, ...rest }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-t border-border", className)} {...rest} />;
}

export function Td({ className, ...rest }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3", className)} {...rest} />;
}
