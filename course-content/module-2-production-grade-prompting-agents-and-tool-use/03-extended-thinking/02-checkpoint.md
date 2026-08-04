---
module: 2
module_title: "Production-Grade Prompting, Agents & Tool Use"
section: 3
section_title: "Extended Thinking"
article: 2
article_type: "Checkpoint"
title: "Checkpoint 2 · Decide when extended thinking earns its cost"
duration: "3 min"
screen_id: "S06"
---

# Checkpoint 2 · Decide when extended thinking earns its cost

Three tasks are described below. For each task, select the correct extended-thinking decision. There is one correct call per task.

### Task 1 · Classify 50,000 support tickets into three labels overnight

- **A.** Never do this.
- **B.** Leave it off.
- **C.** Enable it, budget for the planning step.

**Answer: B** — A one-word label needs no reasoning pass. Reasoning tokens on every ticket multiply output cost across 50,000 calls with no accuracy gain.

### Task 2 · Plan a multi-step refactor where each step depends on the previous one

- **A.** Never do this.
- **B.** Leave it off.
- **C.** Enable it, budget for the planning step.

**Answer: C** — Without the reasoning pass the model commits to a plan before working through the dependencies, and the first dependent step fails.

### Task 3 · Strip the thinking block out of conversation history to save context before the next tool call

- **A.** Never do this.
- **B.** Leave it off.
- **C.** Enable it, budget for the planning step.

**Answer: A** — The signature no longer matches and the next request is rejected. Manage accumulated reasoning with context engineering, not by editing the blocks.

### Why

Classify at volume: leave thinking off. Multi-step dependent plan: enable it and budget for the planning step. Stripping the thinking block: never do this, it breaks the signature.
