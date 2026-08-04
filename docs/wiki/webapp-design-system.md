# Webapp design system (Stackdrop UI)

The webapp implements the company design language, vendored from the **Stackdrop UI
0.1.0** Claude Design kit export. Decision and trade-offs:
[adr/2026-08-04-09](../adr/2026-08-04-09-adopt-stackdrop-design-system.md).

Source of truth chain: Stackdrop site codebase → Claude Design kit ("Stackdrop UI")
→ this repo's vendored copy. Never tune values locally; re-sync (below).

## Token layer

`webapp/src/app/globals.css` — the kit's `:root` (light) and `.dark` blocks verbatim,
mapped to Tailwind v4 utilities in `@theme inline`.

| Token → utility | Purpose |
|---|---|
| `bg-background` / `text-foreground` | page canvas / strong ink |
| `bg-card` | card & panel surfaces |
| `bg-primary`, `text-primary-foreground` | amber signal `#fbb03a` (fills, the dot) |
| `text-accent-text` | amber as TEXT (WCAG-safe) — never `text-primary` for copy |
| `bg-accent-tint` | translucent amber fills (chips, active states) |
| `bg-secondary` / `bg-muted` | inset / sunken surfaces |
| `text-muted-foreground`, `text-ink-2`, `text-ink-4` | label / body / faint ink steps |
| `border-border`, `border-line-soft`, `border-line-strong` | the three hairline weights |
| `text-destructive` etc. | errors, wrong answers, revoked access |
| `ring-ring` | focus rings |
| `max-w-(--shell-max)` | 1280px content sheet |

Structural rules: **zero radius** (whole `--radius-*` scale collapsed to 0), **no
shadows** (borders define structure; emphasis = `hover:border-line-strong`), **no
emoji**, motion 0.14–0.2s.

Both themes ship; **dark is default** (`next-themes`, `attribute="class"`,
`enableSystem` off — see ADR). `ThemeToggle` in the header persists the choice.

## Type roles

Loaded in `layout.tsx` via `next/font/google` (self-hosted at build):

- `font-heading` — Chakra Petch; h1–h6 are auto-uppercased by the base layer.
- `font-sans` — Space Grotesk; the default body face.
- `font-mono` — JetBrains Mono; labels, meta, buttons, pills. Canonical pattern:
  `font-mono text-[11px] uppercase tracking-widest` (or the `mono-label` utility).

Motif utilities available: `bg-dots(-fine)`, `bg-stripe(-tight)`, `mono-label`,
`eyebrow`. Use sparingly — one motif per composition.

## Primitives (`webapp/src/components/ui/`)

| Component | Notes |
|---|---|
| `Button` | kit recipe verbatim: variants `default` (amber) / `outline` / `secondary` / `ghost` / `destructive` / `link`; sizes `xs–lg` + `icon*`. Mono uppercase, h-8 default. Defaults to `type="button"` — pass `type="submit"` in forms. |
| `Card`, `ListCard` | bordered surfaces; `ListCard` = `divide-y` row list (dashboard/module lists) |
| `Badge` | mono label + amber square dot |
| `StatusPill` | tones `default` / `active` (amber tint) / `muted` / `danger` (course extension, see ADR) |
| `StatusDot` | square tri-state dot (`complete` / `partial` / `none`) + built-in `sr-only` state text |
| `Callout` | `info` (amber left rule) / `disclaimer` / `error` / `empty` (dashed) with mono label slot |
| `TableShell`/`TableHead`/`Th`/`Tr`/`Td` | bordered shell, muted header strip, mono column labels |
| `Separator` | hairline rule |
| `ThemeToggle` | ghost icon button, inline stroke SVGs (no icon library) |

State-color mapping (strict amber — the palette has no green) is tabled in the ADR;
short form: complete/correct = amber, partial = amber tint + `n/m` numerals,
wrong/error = destructive, untouched = faint ink.

## Brand mark / favicon

Amber square + ink "S" in Chakra Petch bold (kit `guidelines/brand/logo.md`; never
rounded, never recolored). `src/app/icon.png` + `apple-icon.png` were rendered from
`scratchpad` HTML with the real font via headless Chrome. The header repeats the
mark at 26px next to the wordmark.

## Re-sync runbook

When the kit updates (someone re-exports "Stackdrop UI" from Claude Design):

1. Unzip the export; open `_ds_bundle.css`.
2. Diff its `:root{--background:…}` and `.dark{…}` blocks against the token blocks
   in `webapp/src/app/globals.css`; apply changes verbatim (keep our
   `color-scheme` lines and skip `--chart-*`/`--sidebar-*`/`--popover-*` unless we
   start using them).
3. Diff component recipes (search the bundle's `_ds_bundle.js` for `buttonVariants`,
   `function Badge`, `function StatusPill`) against `src/components/ui/`.
4. Read `guidelines/` for new brand rules; update `webapp/AGENTS.md` if rules changed.
5. Record anything we deviate from in a new ADR.

## Status

Fully adopted 2026-08-04 (Phase A tokens/primitives/chrome + Phase B all-screen
migration, same day). `grep -rnE "\b(slate|emerald|sky|zinc|gray|red|amber)-[0-9]" src/`
returns nothing and must stay that way — the AGENTS.md rule enforces it.

Implementation notes preserved from the migration:

- The content table (`block-renderer.tsx`) intentionally has no `<thead>` — row 0 is
  styled as the header strip; `thead`-scoped CSS will miss it.
- The list bullet's `mt-[0.65rem]` is optically tuned to `leading-7`; retune if the
  body line-height changes.
- Quiz option rows are `<label>` cards around a native radio (`accent-primary`);
  graded states: correct = `border-primary bg-accent-tint`, wrong = destructive tint,
  selected-ungraded = `border-line-strong bg-secondary`. Keep the
  `fieldset`/`sr-only legend` semantics.
- `video-player.tsx` keeps `bg-black` deliberately — it's the letterbox behind the
  dark-canvas video frames, not a themable surface. The heartbeat effect is bound to
  that exact `<video>` element.
- Status is never color-only: `StatusDot` carries `sr-only` text, the admin matrix
  glyphs (`✓`/`—`) have `sr-only` labels, `MarkComplete`'s completed state is a
  `role="status"` live region.
