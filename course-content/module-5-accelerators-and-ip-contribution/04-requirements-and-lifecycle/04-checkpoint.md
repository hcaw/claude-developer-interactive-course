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

Try it now. For each activity below, select the lifecycle phase it belongs to.

### Activity 1 · Pinning the full model ID and keeping the prior version

- **A.** requirements
- **B.** design
- **C.** test
- **D.** deploy
- **E.** operate

**Answer: D** — Pinning the version and retaining the prior one is a deploy decision.

### Activity 2 · Gating promotion on the eval result before a version goes to production

- **A.** requirements
- **B.** design
- **C.** test
- **D.** deploy
- **E.** operate

**Answer: D** — Gating promotion on an eval result before production is a deploy decision.

### Activity 3 · Deciding data must be processed in a specific region

- **A.** requirements
- **B.** design
- **C.** test
- **D.** deploy
- **E.** operate

**Answer: A** — The residency rule is a requirement.

### Activity 4 · Instrumenting token cost and latency per call in production

- **A.** requirements
- **B.** design
- **C.** test
- **D.** deploy
- **E.** operate

**Answer: E** — Instrumenting cost and latency in production is operate.

### Activity 5 · Choosing Amazon Bedrock because the customer holds its compliance posture there

- **A.** requirements
- **B.** design
- **C.** test
- **D.** deploy
- **E.** operate

**Answer: B** — The platform that satisfies the requirement is a design choice.

### Why

The residency rule is a requirement, the platform that satisfies it is a design choice, gating promotion on an eval result is a deploy decision, and instrumenting cost and latency is operate. Writing the eval suite and rubric is test; gating promotion on its result is deploy — which is why no activity here lands in test.

### Other feedback branches

- **Partial · n/5:** Re-check each: the residency rule is a requirement, the platform choice is design, pinning and gating are deploy, and instrumentation is operate.
