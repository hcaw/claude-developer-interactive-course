# Webapp planning session — 2026-08-01

Status: Concluded (decisions promoted to ADRs 2026-08-01-01 … -06)

Dated record of how the webapp's architecture was decided. Current truth
lives in the wiki; rationale in the ADRs. This file records the path.

## 1. Video hosting research

An 8-agent research pass fetched current (Aug 2026) pricing for: Cloudflare
R2, Cloudflare Stream, Bunny.net, Backblaze B2, Mux, Supabase Storage,
Vercel Blob, Appwrite, and the S3+CloudFront baseline. Headline findings:
R2 and S3+CloudFront both effectively $0/month at this workload (~590MB
stored, ~50GB/mo egress); managed video platforms (Stream/Mux/Bunny) add
$1–10/mo for transcoding this content doesn't need; BaaS free tiers cap
egress below the workload. Initial lean was R2 (zero egress by policy);
**the user pivoted to S3** — already operated in-house — and the numbers
confirmed S3+CloudFront is equally ~free at this scale.

## 2. Decision interview (grilling)

Settled one branch at a time with the user:

- Scope: **full interactive course** (videos + articles + graded quizzes) —
  not videos-only.
- Audience: **internal team (~20, distributed across countries)**; Google
  sign-in, allowlist.
- Stack (user's own formulation): **Next.js + existing RDS (new schema) +
  S3, hosted on Vercel to start**, revisit hosting later if needed.
- RDS reachability: **Postgres, public + TLS acceptable** (Vercel functions
  are outside the VPC).
- Content: **static at build time**; DB is user-data only.
- Progress: **auto** — heartbeat/resume, 90% completion, quiz gates.
- Admin: **simple users × modules matrix** in MVP.
- Repo: **`webapp/` in this repo** (generator reads sibling dirs).
- CloudFront re-challenged ("do 20 people need a CDN?"): kept — private
  bucket without signing code, latency for the distributed team, 1TB free
  egress tier vs $0.09/GB direct S3.

## 3. Data-model interview

The user asked to be grilled decision-by-decision on the DB structure:

1. No content tables — activity-only DB, string ids validated in app code.
2. Completion **derived on read + transition snapshots** (user upgraded
   from plain derive: wanted longitudinal reporting) → append-only
   `completion_events` written on false→true transitions.
3. Video tracking: high-water mark, ≥90%; seek-gaming accepted.
4. Quiz attempts: append-only, jsonb letter arrays, unlimited retakes,
   best attempt counts.
5. Single-course keys; `course_id` migration is the second-course plan.
6. Records retained forever; offboarding = allowlist removal.

## 4. Docs-first pivot

Before implementation, the user redirected the deliverable to **ADRs + wiki
only** (this bootstrap). Implementation milestones M1–M5 are defined in
docs/wiki/webapp-architecture.md and tracked in docs/wiki/status.md.
