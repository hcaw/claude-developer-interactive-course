---
module: 4
module_title: "Production Engineering, Evals & Security"
section: 4
section_title: "Failure Handling & Model Selection"
article: 5
article_type: "Checkpoint"
title: "Choose the model and name the deciding constraint"
duration: "2 min"
screen_id: "S10B"
---

# Choose the model and name the deciding constraint

**For each scenario, pick the model tier (Opus, Sonnet, or Haiku) and identify the one constraint that drives the decision.**

### Scenario 1

A high-volume classification step labels millions of short messages per day; an eval shows Haiku holding the quality bar. Which choice is best?

- **A.** Opus, the deciding constraint is reasoning depth on ambiguous messages
- **B.** Sonnet, the deciding constraint is balancing quality and speed across volume
- **C.** Haiku, the deciding constraint is cost-at-volume, since the eval confirms the quality bar still holds
- **D.** Opus, the deciding constraint is consistency across millions of requests

**Answer: C** — The deciding constraint is cost-at-volume, and the eval confirms the quality bar still holds, so paying for a larger model buys nothing.

### Scenario 2

A multi-step agent plans a dependent refactor where a wrong early step is expensive; an eval shows Sonnet missing the bar on the hardest cases. Which choice is best?

- **A.** Sonnet, the deciding constraint is cost efficiency on a long agent run
- **B.** Opus, the deciding constraint is quality on hard reasoning where the cost of a wrong answer is high
- **C.** Haiku, the deciding constraint is speed across many sequential steps
- **D.** Sonnet, the deciding constraint is latency on dependent steps

**Answer: B** — The decision constraint is quality on hard reasoning where the cost of a wrong answer is high, and the eval shows the step up is needed.

### Scenario 3

Mixed traffic: most requests are simple lookups, a few are complex synthesis. Which approach is best?

- **A.** Opus for everything, the deciding constraint is guaranteeing quality on the complex requests
- **B.** Haiku for everything, the deciding constraint is minimizing cost across all traffic
- **C.** Sonnet for everything, the deciding constraint is a single balanced model for mixed needs
- **D.** Route: a Sonnet (or Haiku) default with an Opus override on the complex requests, the deciding constraint is that traffic is mixed

**Answer: D** — The deciding constraint is that traffic is mixed, so a single model either overpays on the simple requests or underperforms on the complex ones.

### Why

Scenario 1: Haiku, cost-at-volume with the quality bar confirmed by eval. Scenario 2: Opus, quality on hard reasoning where the cost of a wrong answer is high. Scenario 3: route a Sonnet or Haiku default with an Opus override, because traffic is mixed.

### Other feedback branches

- **Partial:** Review the scenario(s) you missed. The deciding constraint is always the thing that would change if you picked a different model: cost-at-volume, quality on a hard reasoning step, or a mixed traffic shape that needs a router.
