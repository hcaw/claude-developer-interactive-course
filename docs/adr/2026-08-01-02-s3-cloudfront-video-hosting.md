# Host course videos on S3 behind CloudFront with OAC

Date: 2026-08-01
Status: Accepted

## Decision

Course MP4s live in a private S3 bucket served exclusively through
CloudFront with Origin Access Control. Progressive MP4, plain `<video>`,
no transcoding, no signed URLs — gating is the app login plus unadvertised
URLs ("casual gating").

## Context

~590 MB of small 1080p MP4s (inventory:
[../wiki/course-content-inventory.md](../wiki/course-content-inventory.md))
for ~20 internal users distributed across countries; Stackdrop already runs
AWS. An Aug 2026 pricing pass compared eight alternative providers against
this baseline. CloudFront was re-challenged for a 20-person team and
kept: it's the only zero-app-code way to serve a *private* bucket, its
permanent 1TB/mo free egress dwarfs the workload (direct S3 is $0.09/GB
past a shared 100GB allowance), and edge termination helps seek latency
abroad. Assumptions: files stay small (no adaptive bitrate needed) and
sensitivity stays internal-casual.

## Alternatives rejected

- **Cloudflare R2** — $0 too, but needs a card + DNS zone on Cloudflare for
  a production domain; a second cloud for no gain over in-house S3.
- **Cloudflare Stream / Mux / Bunny Stream** — paid transcoding+player
  platforms; adaptive bitrate is unneeded for these small whiteboard
  explainers.
- **Backblaze B2** — free egress only when fronted by Cloudflare: two
  vendors to match what S3+CloudFront does in one.
- **Supabase / Vercel Blob / Appwrite** — free-tier egress caps (5–10GB/mo)
  below the workload; Vercel Hobby hard-pauses on overage.
- **Direct S3 + presigned URLs** — signing code in the app, single-region
  latency abroad, pricier egress path.

## Consequences

- Bucket blocks all public access; only the distribution ARN reads (OAC).
- Video URLs are stable (`NEXT_PUBLIC_VIDEO_BASE_URL` + path); no signing
  code anywhere. Upload path: `aws s3 sync` from `output/` (repo = source
  of truth).
- Revisit trigger: external/paid learners → CloudFront signed cookies
  (requires a custom domain).
