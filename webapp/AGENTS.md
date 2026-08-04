<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design system (Stackdrop UI)

The UI follows the company design system, vendored from the Stackdrop UI kit export (Claude Design). Full reference: docs/wiki/webapp-design-system.md · rationale: the design-system adoption ADR in docs/adr/.

- Style with **semantic tokens and `src/components/ui/` primitives only**. Never raw palette utilities (`slate-*`, `emerald-*`, `zinc-*`, `sky-*`…), never hardcoded hex/rgb. Token layer lives in `src/app/globals.css`; every token works in both light and dark (`.dark` class, next-themes, dark is the default).
- **Amber is the only positive/success signal** (`bg-primary` dots, `text-accent-text` copy, `bg-accent-tint` fills). There is no green in the palette — don't add one. Errors/wrong answers use the `destructive` family. Amber as TEXT must be `text-accent-text`, never `text-primary` (contrast).
- **Zero radius, no shadows, no emoji.** Borders define structure (`border-border`; emphasis `hover:border-line-strong`), never elevation. All `rounded-*` utilities resolve to 0 — write `rounded-none` in new code for clarity.
- **Type roles:** headings = `font-heading` (Chakra Petch, auto-uppercase via base layer); body = `font-sans` (Space Grotesk); labels/meta/buttons = mono pattern `font-mono text-[11px] uppercase tracking-widest` (or the `mono-label` utility).
- Don't invent new component variants or recolor the brand mark; if the kit lacks something, extend a primitive in `src/components/ui/` and record the deviation in an ADR (as done for `StatusPill` tone `danger`).
