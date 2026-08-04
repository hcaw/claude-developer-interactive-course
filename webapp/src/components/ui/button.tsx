import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

// Variant recipe vendored verbatim from Stackdrop UI 0.1.0 (components/ui/button.tsx in the
// kit bundle). Buttons are mono, uppercase, zero-radius, border-defined. Don't invent variants;
// re-sync from the kit if upstream changes.
export const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border bg-clip-padding font-mono text-xs font-medium uppercase tracking-[0.08em] whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:bg-accent-text hover:border-accent-text dark:hover:text-primary-foreground",
        outline:
          "border-line-strong bg-transparent text-foreground hover:bg-secondary aria-expanded:bg-secondary",
        secondary:
          "border-line-strong bg-card text-foreground hover:bg-secondary aria-expanded:bg-secondary",
        ghost: "border-transparent hover:bg-muted hover:text-foreground aria-expanded:bg-muted",
        destructive:
          "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
        link: "border-transparent text-accent-text underline-offset-4 hover:underline normal-case tracking-normal font-sans",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
