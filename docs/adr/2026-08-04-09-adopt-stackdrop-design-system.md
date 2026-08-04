# Adopt the Stackdrop design system, vendored as tokens + primitives

Date: 2026-08-04
Status: Accepted

## Decision

The webapp adopts the company design system — **Stackdrop UI 0.1.0**, the Claude
Design kit generated from the live Stackdrop site — by **vendoring its tokens and
component recipes into this repo**, not by installing the kit as a dependency.

- Token layer: the kit's `:root` (light) and `.dark` token blocks are copied
  verbatim into `webapp/src/app/globals.css`, mapped to Tailwind v4 utilities via
  `@theme inline`. The entire radius scale is collapsed to `0px` (hard rectangles
  are a structural rule of the system).
- Primitives: `webapp/src/components/ui/` (Button, Card/ListCard, Badge,
  StatusPill, StatusDot, Callout, Table, Separator, ThemeToggle) reimplement the
  kit's class recipes, extracted from its compiled bundle.
- Both themes ship. **Dark is the default** (`next-themes`, class strategy,
  `enableSystem` off): the whiteboard course videos render on a dark canvas, so
  dark remains the primary viewing experience — this supersedes the earlier
  dark-*only* commitment that lived as a comment in `globals.css`. A header
  toggle switches to light and persists per browser.
- Type roles: Chakra Petch (display, uppercase), Space Grotesk (body),
  JetBrains Mono (labels) — self-hosted through `next/font/google`, not the
  kit's Google Fonts CSS `@import`.
- Favicon/brand mark: the amber square + ink "S" per the kit's logo guidelines,
  rendered with the real Chakra Petch font (headless Chrome screenshot →
  `src/app/icon.png` + `apple-icon.png`). The guidelines forbid inventing a
  different mark.

## State-color mapping (strict amber, no green)

The Stackdrop palette deliberately contains no green: "signal is carried by mono
type and the amber dot". Rather than extend the palette, course states map onto
the system's own signal colors:

| Course state | Treatment |
|---|---|
| complete / correct / passed | solid amber — `bg-primary` dot, `text-accent-text` copy, `border-primary bg-accent-tint` pill |
| partial progress | translucent amber — `bg-accent-tint` dot + mono `n/m` numerals |
| untouched | faint ink — `bg-line-strong` dot, `text-ink-4` |
| wrong / error / revoked | `destructive` family |
| selected-but-ungraded (quiz) | neutral emphasis — `border-line-strong bg-secondary` |
| links | `text-accent-text` + underline |

This is a deliberate deviation from the green-means-success web convention;
right/wrong stays legible because wrong is red *and* every state also carries a
text label (a brand rule, and an a11y improvement over color-only dots).
`StatusPill` gains a `danger` tone the kit lacks — recorded here as the one
approved extension.

## Context

The app shipped with ad-hoc dark-only styling: ~40 distinct raw palette
utilities (`slate-*`, `emerald-*`, `sky-*`…), five button spellings, five card
shapes, two hex tokens. The company design system reached usable form as a
Claude Design export ("Stackdrop UI", downloaded zip). The kit is code-canonical
— generated from the Stackdrop site codebase — and its own docs instruct
consumers not to edit kit files but to re-sync from source.

## Options considered

- **Load the kit bundle directly** (`_ds_bundle.js` → `window.StackdropUI`):
  rejected — it's a browser-global React bundle for design previews, not a
  library; it would bypass Next.js SSR, fonts, and tree-shaking.
- **Depend on the upstream `stackdrop-ui` package**: not published to a
  registry we can reach, and the upstream repo is not on this machine; the kit
  export is the distribution channel today.
- **Vendor tokens + recipes (chosen)**: token values are copied verbatim and
  primitives follow the kit's compiled class recipes, so a future re-sync is a
  diff of `globals.css` + `ui/` against a fresh export.

## Consequences

- Raw palette utilities are now banned in webapp code (rule in
  `webapp/AGENTS.md`); everything styles through semantic tokens, so a kit
  re-sync is a token-file change.
- New deps: `next-themes`, `class-variance-authority`, `clsx`, `tailwind-merge`
  (the kit's own idiom).
- Until the screen-migration pass lands, pre-existing screens still hardcode
  `slate-*`: near-invisible on dark, visibly wrong if a user flips to light
  early. Accepted as a short transitional state.
- Re-sync runbook lives in [webapp-design-system](../wiki/webapp-design-system.md).
