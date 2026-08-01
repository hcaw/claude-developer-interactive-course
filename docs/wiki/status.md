---
kind: status
---

# Status

Last verified: 2026-08-01

## What works today

- **All 67 course videos are rendered** (5 modules, 44 sections, 590 MB in `output/`). The video pipeline (parse → script → TTS → Remotion render) is complete and documented in the repo README.
- **Webapp design is approved and fully documented** — architecture, data model, content inventory, and six ADRs (see [../index.md](../index.md)). No webapp code exists yet.

## In flight

- Nothing — next step is webapp implementation, milestone M1.

## Next

1. **M1 — Static browse**: content generator + article/video pages, S3 + CloudFront provisioned (videos playable). Demoable without auth or DB.
2. **M2 — Auth**: Google sign-in, allowlist.
3. **M3 — Video progress**: RDS schema, heartbeat, resume, completion.
4. **M4 — Assessments**: quizzes with grading, reveal flow.
5. **M5 — Admin + deploy**: admin matrix, Vercel production.

## Where things run

Nowhere yet. Target: Vercel (app) + S3/CloudFront (videos) + existing RDS (`course_app` schema). Infra provisioning happens in M1/M3 per the runbook in [webapp-architecture.md](webapp-architecture.md).
