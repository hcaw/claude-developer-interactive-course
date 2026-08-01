# Bake course content into the app at build time; answer keys server-only

Date: 2026-08-01
Status: Accepted

## Decision

A generator script (`webapp/scripts/generate-content.mjs`) converts
`build/bundles/*.json` + `video-scripts/*/script.json` into two checked-in
files: a client-safe content manifest (articles, structured quiz questions
*without* answers, video metadata) and a server-only answer-key module. The
database never stores content — see
2026-08-01-06-activity-only-data-model-derived-completion.

## Context

The course is finished and static. The parse
pipeline splits quiz answer keys from learner content — that split must
survive to production: answers may never reach the client bundle. `build/`
is gitignored and needs the root pipeline to regenerate, so checked-in
generated output keeps `webapp/` deploys hermetic and makes answer-key
diffs reviewable in PRs. Assumption: content changes stay rare; revisit if
the course becomes frequently edited.

## Alternatives rejected

- **Content in Postgres** — seeding machinery and drift risk for content
  that rarely changes; loses type-safety of a static manifest.
- **Content JSON fetched from S3 at runtime** — adds fetch/caching failure
  modes for zero flexibility gain at this scale.
- **Generate during the Vercel build** — non-hermetic: requires root
  pipeline deps and gitignored inputs at deploy time.

## Consequences

- Content edits require `npm run content:gen` + commit; CI can diff-check
  with `content:check`.
- The answer-key module starts with `import 'server-only'`; only grading API
  routes may import it. Never import it from anything client-reachable.
- The generator whitelists output fields (never copies `answerKey` into the
  manifest) and must fail on unknown content anomalies — see the anomaly
  rules in [../wiki/course-content-inventory.md](../wiki/course-content-inventory.md).
- Generated files are never hand-edited.
