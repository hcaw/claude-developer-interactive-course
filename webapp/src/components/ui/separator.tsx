import { cn } from "@/lib/cn";

export function Separator({
  orientation = "horizontal",
  className,
  ...rest
}: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "horizontal" ? "w-full border-t border-border" : "self-stretch border-l border-border",
        className,
      )}
      {...rest}
    />
  );
}
