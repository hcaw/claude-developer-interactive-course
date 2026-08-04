---
module: 5
module_title: "Accelerators & IP Contribution"
section: 5
section_title: "Deployment & Versioning"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 5: Match the deployment platform and version pin to each scenario"
duration: "4 min"
screen_id: "S10"
---

# Checkpoint 5: Match the deployment platform and version pin to each scenario

Try it now. A customer runs AWS with a data-residency requirement and needs to be able to roll back a model update. Select the one correct piece in each group below to assemble the minimal deployment configuration that satisfies both.

### Platform Group

- **A.** First-party API
- **B.** Amazon Bedrock
- **C.** Google Vertex AI

**Answer: B** — Bedrock keeps identity and data inside the AWS boundary the customer already cleared; the first-party API or Vertex AI moves them outside it.

### Identity Group

- **A.** AWS identity reference
- **B.** Anthropic API key

**Answer: A** — An AWS identity reference stays inside the customer's cleared boundary; an Anthropic key moves identity outside it.

### Model reference group

- **A.** A pinned full model ID
- **B.** A moving alias

**Answer: A** — The pinned full Bedrock model ID (with the anthropic. prefix) makes an upstream change something you adopt deliberately; a moving alias drifts underneath you.

### Rollback Group

- **A.** Retain the prior pinned version
- **B.** No retention

**Answer: A** — Retaining the prior version is what gives you a rollback target; a pinned ID with no retained version still cannot roll back.

### Why

Bedrock keeps identity and data inside the AWS boundary the customer already cleared, the pinned full Bedrock model ID (with the anthropic. prefix) makes an upstream change something you adopt deliberately, and retaining the prior version gives you a rollback target. That is the minimal set that satisfies both residency and rollback.

### Other feedback branches

- **Partial · n/4:** You got the platform right but left a gap. A pinned model ID without a retained prior version still cannot roll back, and a retained version behind a moving alias still drifts. Both pieces are needed together.
- **Revisit:** Check what each wrong piece would have allowed: an Anthropic key or the first-party API moves identity and data outside the AWS boundary the customer requires, and a moving alias plus no retention is exactly the unpinned deployment that has no version to roll back to.
