# Build the webapp as Next.js in this repo, on Vercel, against existing RDS

Date: 2026-08-01
Status: Accepted

## Decision

The course webapp is a Next.js (App Router, TypeScript) app in `webapp/` of
this repo, deployed on Vercel (Root Directory = `webapp`). It uses the
existing RDS Postgres instance with a new dedicated schema `course_app` and
a dedicated role, via Drizzle ORM + node-postgres.

## Context

Internal tool for ~20 users; speed to first launch was the stated priority.
RDS already exists; a new schema + role isolates the app without new infra.
Vercel functions run outside the VPC with no stable egress IPs, so the
instance must be publicly accessible with TLS and a strict security group —
explicitly accepted. Monorepo because the content generator reads sibling
dirs (2026-08-01-04-course-content-static-at-build). Vercel is "to start";
moving hosting later was explicitly anticipated.

## Alternatives rejected

- **All-in on AWS (Amplify/SST)** — single cloud and private DB networking,
  but meaningfully slower first deploy and more infra to configure for an
  internal MVP.
- **Appwrite Cloud (BaaS)** — bundles auth+DB+storage, but overlaps the S3
  decision and adds a second platform; $25/mo Pro needed for real bandwidth.
- **Neon Postgres** — serverless-friendly, but a new vendor when RDS is
  already paid for and operated.
- **Separate repo for the webapp** — clean deploy surface, but the content
  manifest would need cross-repo publishing on every content change.

## Consequences

- DB access uses a node-postgres Pool with `max: 1`, memoized on
  `globalThis`; raise to 2–3 before ever considering RDS Proxy.
- TLS verifies against the bundled RDS CA (`certs/rds-global-bundle.pem`);
  `rejectUnauthorized: false` is forbidden.
- Drizzle migrations run manually from a dev machine as the dedicated role —
  never inside the Vercel build.
- All app tables live in schema `course_app`; the `public` schema is
  off-limits to the app role.
