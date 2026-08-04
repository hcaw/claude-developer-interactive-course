# The lesson is the unit of content, routing and completion

Date: 2026-08-04
Status: Accepted
Supersedes: the *section as the unit* half of
[2026-08-01-06](2026-08-01-06-activity-only-data-model-derived-completion.md).
Its actual decision — store only activity, derive completion, snapshot
transitions — is unchanged and still the rule. This ADR only moves what
"complete" is computed for.

## Decision

**One authored article = one lesson = one page = one URL = one unit of
completion.** 44 section pages become 108 lesson pages at `/lessons/{slug}`.

Sections are deleted as a concept. The section title survives only as a
non-clickable heading grouping lessons on the module page. `/sections/*` is
gone; old links break, which was accepted explicitly.

A lesson is complete when every requirement it *has* is met:

| the lesson has | requirement |
|---|---|
| a non-debrief video it owns the player for | watched to 90% |
| a gradeable quiz | a passing attempt on its key |
| a free-form assessment | the model answer revealed |
| none of the above (33 lessons) | recorded as read on view |

A module is complete when all of its lessons are.

**Videos attach to lessons via each `script.json`'s `covers` array**, replacing
the `m{module}-{NN}` filename-prefix join and the free-text `source` field.
The first lesson in `covers` renders the player; the others show a pointer to
it.

## Context

The app was built around the section because the *pipeline* is: `parse.mjs`
emits one bundle per section directory, and one video is rendered per section.
But the unit an author actually writes is the article — a teaching piece, a
"watch out" story, a checkpoint — and the section page simply stacked all of
them onto one scrolling URL. That produced four visible defects at once:

1. The title was printed three times: the section `<h1>`, the article `<h2>`,
   and the `# Title` heading each markdown file opens with.
2. A "Congrats, you completed this module" banner rendered on the same page as
   the quiz that had not been taken yet.
3. There was no way to link to, or track, one lesson.
4. **25 debrief videos never rendered at all.** The section page did
   `section.video ?? section.debriefVideo`, so any section with both showed
   only the main one — every checkpoint walkthrough in the course was
   unreachable.

The prefix join is what forced (4): the manifest could hold at most one main
and one debrief per section, because a filename prefix cannot express "this
video narrates the teaching lesson *and* the watch-out story after it". The
`covers` field can, and the corpus already recorded that mapping accurately in
prose — 104 of 108 articles were named in some script's `source`, with only the
four module glossaries genuinely un-narrated.

**This is a routing and derivation change, not a content migration.** No
markdown file moves. `Article.key` (the source path) was already the primary
key in `quiz_attempts.article_key` and `manual_completions.item_key`, and video
ids are unchanged, so every existing activity row still matches. That is what
made a change this size cheap.

## Alternatives rejected

- **Keep section pages, add per-article anchors** — fixes nothing structural.
  The module-complete banner still sits on the quiz page, and completion is
  still tracked for a thing the learner cannot see.
- **Split pages but keep section-derived completion** — no migration at all,
  but the learner sees 108 pages while progress counts 44 invisible buckets. A
  page could read as done while its section was not, with no page anywhere
  explaining why.
- **One dedicated video per article** — the honest 1:1. It costs 77 new scripts
  plus ~30 rewrites and 108 re-renders, needs a new video id scheme, and
  destroys the deliberate teach → do-it-yourself → debrief gating that every
  main/debrief pair is built around. The narration already covers the articles;
  only the mapping was missing.
- **Explicit "Mark complete" button on the 33 requirement-free lessons** —
  honest, and it reuses the existing component unchanged. Rejected as friction:
  a glossary is done when you have read it.

## Consequences

- **`completion_events.item_type` moves from `'section'` to `'lesson'`, and
  `item_id` holds a source path rather than a section id.** The CHECK accepts
  `'section'` still, because the table is append-only and rows written before
  this must stay readable. Nothing writes it.
- `quiz_attempts.section_id` is dropped: written at submit time, never read by
  the derivation, and `article_key` already identifies the lesson. The column
  name `article_key` is kept — an article *is* a lesson.
- **Auto-record on view must be a client effect, never a server write during
  render.** Next prefetches `<Link>` targets on hover, which runs the server
  component; a write there would complete lessons the learner only pointed at.
- **"Module complete" lessons gate on the module being complete *excluding
  themselves*.** They are view-only, so reading one completes it, which would
  complete the module — a page that unlocks itself. While locked they list what
  is left and do not record the view.
- **The generator gained real invariants and fails on all of them**: a
  duplicate lesson slug, a `covers` path that is not a lesson, an mp4 with no
  script or a script with no mp4, a lesson claimed by two videos, and a leading
  `H1` that does not match its frontmatter title. The last one is what lets the
  duplicate-title strip be automatic instead of 107 hand edits.
- `generate-content.mjs` now reads `video-scripts/` as a third input. Adding
  `covers` to the 67 scripts required **no re-render** — the Remotion renderer
  never read the field it replaces.
- Module pages get longer (Module 2 lists 29 lessons). Accepted: they are
  grouped under the old section titles, which are usually a better label than
  the article titles under them.
