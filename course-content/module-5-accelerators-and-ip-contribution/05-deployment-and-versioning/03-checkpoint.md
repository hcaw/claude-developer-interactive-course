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

Try it now. A customer runs AWS with a data-residency requirement and needs to be able to roll back a model update. Select the one correct piece in each group below to assemble the minimal deployment configuration that satisfies both. Leave out what does not belong.

#### Platform Group

- First-party API
- Amazon Bedrock
- Google Vertex AI

#### Identity Group

- AWS identity reference
- Anthropic API key

#### Model reference group

- A pinned full model ID
- A moving alias

#### Rollback Group

- Retain the prior pinned version
- No retention

### Answer

- **Platform Group**  
  Amazon Bedrock
- **Identity Group**  
  AWS identity reference
- **Model reference group**  
  A pinned full model ID
- **Rollback Group**  
  Retain the prior pinned version

### Why

Bedrock keeps identity and data inside the AWS boundary the customer already cleared, the pinned full Bedrock model ID (with the anthropic. prefix) makes an upstream change something you adopt deliberately, and retaining the prior version gives you a rollback target. That is the minimal set that satisfies both residency and rollback.

### Other feedback branches

- **Partial · n/4:** You got the platform right but left a gap. A pinned model ID without a retained prior version still cannot roll back, and a retained version behind a moving alias still drifts. Both pieces are needed together.
- **Revisit:** Check what each wrong piece would have allowed: an Anthropic key or the first-party API moves identity and data outside the AWS boundary the customer requires, and a moving alias plus no retention is exactly the unpinned deployment that has no version to roll back to.
