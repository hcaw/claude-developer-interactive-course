---
module: 2
module_title: "Production-Grade Prompting, Agents & Tool Use"
section: 6
section_title: "Context Engineering"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 5 · Diagnose the context failure"
duration: "3 min"
screen_id: "S15"
---

# Checkpoint 5 · Diagnose the context failure

The session trace below shows a multi-turn agent run with degrading tool selections. Read the trace, identify which turn triggered the failure, name the mechanism, and select the one-line fix from the three options below.

**Session trace**

| Turn | Tool called | Result size |
|---|---|---|
| 1 | fetch_policy_document, correct selection | 2,400 tokens |
| 2 | fetch_policy_document, correct selection | 2,400 tokens |
| 3 | fetch_policy_document, correct selection | 2,400 tokens |
| 4 | fetch_policy_document, correct selection | 2,400 tokens |
| 5 | search_knowledge_base instead of apply_coverage_rule, wrong selection | 1,800 tokens |
| 6 | search_knowledge_base again, wrong selection (same as turn 5) | 1,800 tokens |
| 7 | Session ends without result | N/A |

- **A.** Add a clearer description to the apply_coverage_rule tool schema.
- **B.** Prune fetch_policy_document results after each turn so that accumulated outputs do not crowd out current instructions, and apply compaction before turn 5.
- **C.** Increase max_tokens in the API call to give Claude more room to respond.

**Answer: B** — The failure triggered at turn 5, not turn 1. Correct tool selections at turns 1-4 rule out a schema description problem. The turn-5 shift points to accumulated context, which included four large tool results filling the window and pushing current instructions toward the edge.

### Why — the trace, turn by turn

- **Turn 1** — fetch_policy_document, correct selection, 2,400 tokens. Correct tool call. No sign of trouble yet.
- **Turn 2** — fetch_policy_document, correct selection, 2,400 tokens. Still correct. Context is accumulating: 4,800 tokens of tool output so far.
- **Turn 3** — fetch_policy_document, correct selection, 2,400 tokens. Still correct. Accumulated tool output now around 7,200 tokens.
- **Turn 4** — fetch_policy_document, correct selection, 2,400 tokens. Last correct turn. Four large tool results (9,600 tokens) are now sitting in the context window, crowding the instructions that tell Claude which tool to use next.
- **Turn 5** — search_knowledge_base instead of apply_coverage_rule, wrong selection, 1,800 tokens. This is where the failure starts. Tool selection did not degrade because of a bad schema description; turns 1-4 prove the schema works. The accumulated context from four prior tool calls is what shifted the selection.
- **Turn 6** — search_knowledge_base again, wrong selection (same as turn 5), 1,800 tokens. The same wrong call repeats, confirming this is not a one-off fluke but a systemic drift caused by the crowded context window.
- **Turn 7** — Session ends without result, N/A. The session never recovers and terminates without completing the task.

**Why the other options are wrong:**

- **A.** This would fix a tool-selection problem caused by an ambiguous schema. That is not what the trace shows.
- **C.** Increasing max_tokens controls how much Claude can write in a single response, not how much context it can read. That is the wrong parameter for this problem.
