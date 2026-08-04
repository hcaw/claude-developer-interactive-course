---
module: 2
module_title: "Production-Grade Prompting, Agents & Tool Use"
section: 8
section_title: "Agent Memory"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 7 · Choose the right memory pattern"
duration: "3 min"
screen_id: "S21"
---

# Checkpoint 7 · Choose the right memory pattern

Read the three agent use cases below. For each use case, select the correct memory scope. There is one correct scope per use case.

### Use case 1 · A customer support agent assists the same user across daily check-ins over two weeks. Each session starts where the previous one left off.

- **A.** In-context memory: all state lives in the active conversation.
- **B.** External storage: write state to a database at session end, then read it back at session start.
- **C.** No persistent memory (stateless): each session starts fresh.

**Answer: B** — In-context state resets when the session ends, so on day two the agent has no record of yesterday's check-in. Every session would open as a first contact, and the user has to re-explain their situation from scratch.

### Use case 2 · A document formatter receives a file, applies a transformation, returns the output, and terminates. Each job is fully independent.

- **A.** In-context memory: all state lives in the active conversation.
- **B.** External storage: write state to a database at session end, then read it back at session start.
- **C.** No persistent memory (stateless): each session starts fresh.

**Answer: C** — External storage adds read and write calls to a job that has no continuity requirement. Nothing breaks, but every run pays a latency and implementation cost for state the agent will never reuse.

### Use case 3 · A coding assistant works with a developer across a multi-hour session. The session will not continue after it ends.

- **A.** In-context memory: all state lives in the active conversation.
- **B.** External storage: write state to a database at session end, then read it back at session start.
- **C.** No persistent memory (stateless): each session starts fresh.

**Answer: A** — External storage is unnecessary overhead for a session that ends when the developer logs off. A summarized memory layer would compress out the exact code-level detail the developer still needs to reference later in the same session.

### Why

The deciding question is always continuity: does state need to outlive the session? Cross-session continuity needs external storage, independent jobs need no memory at all, and a single long session is exactly what the context window already covers.
