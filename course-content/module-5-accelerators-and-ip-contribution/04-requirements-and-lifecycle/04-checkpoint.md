---
module: 5
module_title: "Accelerators & IP Contribution"
section: 4
section_title: "Requirements & Lifecycle"
article: 4
article_type: "Checkpoint"
title: "Checkpoint 4: place the work in the right phase"
duration: "2 min"
screen_id: "S07D"
---

# Checkpoint 4: place the work in the right phase

Try it now. Place each activity in the lifecycle phase it belongs to: requirements, design, test, deploy, operate.

### Answer

- **(a) pinning the full model ID and keeping the prior version**  
  deploy
- **(b) gating promotion on the eval result before a version goes to production**  
  deploy
- **(c) deciding data must be processed in a specific region**  
  requirements
- **(d) instrumenting token cost and latency per call in production**  
  operate
- **(e) choosing Amazon Bedrock because the customer holds its compliance posture there**  
  design

### Why

- **(a) pinning the full model ID and keeping the prior version** — Pinning the version and retaining the prior one is a deploy decision.
- **(b) gating promotion on the eval result before a version goes to production** — Gating promotion on an eval result before production is a deploy decision.
- **(c) deciding data must be processed in a specific region** — The residency rule is a requirement.
- **(d) instrumenting token cost and latency per call in production** — Instrumenting cost and latency in production is operate.
- **(e) choosing Amazon Bedrock because the customer holds its compliance posture there** — The platform that satisfies the requirement is a design choice.

The residency rule is a requirement, the platform that satisfies it is a design choice, gating promotion on an eval result is a deploy decision, and instrumenting cost and latency is operate. Writing the eval suite and rubric is test; gating promotion on its result is deploy.

### Other feedback branches

- **Partial · n/5:** Re-check each: the residency rule is a requirement, the platform choice is design, pinning and gating are deploy, and instrumentation is operate.
