---
module: 4
module_title: "Production Engineering, Evals & Security"
section: 5
section_title: "Cost & Orchestration"
article: 3
article_type: "Checkpoint"
title: "Match each task to its agent type and cost lever"
duration: "8 min"
screen_id: "S13"
---

# Match each task to its agent type and cost lever

Try it now. For each of the four scenarios below, select the configuration snippet that best matches it. Each snippet is labeled with its agent type and the primary cost lever it uses.

**Labeled configuration snippets**

```text
A  orchestrator_worker(lead=LARGE, workers=SMALL, n=5)    # lever: parallel split
B  single_agent(model=SMALL, batch=True, cache=True)      # lever: Message Batches API (~50% cost reduction) + prompt caching
C  single_agent(model=SMALL, retrieval="fetch_once")      # lever: model choice
D  single_agent(model=SMALL, stream=True)                 # lever: streaming
```

1. A single-fact lookup against a stable reference corpus
2. A broad research question that splits into independent parts explored at once
3. A user-facing request where the reply should feel instant
4. A cost-sensitive, non-urgent batch job

## Answers

| Scenario | Correct snippet |
|---|---|
| A single-fact lookup against a stable reference corpus | C |
| A broad research question that splits into independent parts explored at once | A |
| A user-facing request where the reply should feel instant | D |
| A cost-sensitive, non-urgent batch job | B |

### Why

- **A single-fact lookup against a stable reference corpus → C.** Fetch-once retrieval with the smallest model that works; no need to pay for iteration or fan-out.
- **A broad research question that splits into independent parts explored at once → A.** The one task that genuinely parallelizes, so the fan-out multiplier buys parallel exploration.
- **A user-facing request where the reply should feel instant → D.** Streaming so the response is perceived as fast even before it finishes.
- **A cost-sensitive, non-urgent batch job → B.** Batch and cache because latency does not matter and the same context recurs across requests. The Message Batches API processes requests asynchronously and reduces cost by approximately 50%; prompt caching compounds the saving when context is reused across calls.

You matched 1 to C (fetch-once, smallest model that works), 2 to A (the one task that splits into independent parts, so the fan-out multiplier buys parallel exploration), 3 to D (streaming so the reply feels instant), and 4 to B (batch and cache for a cost-sensitive non-urgent job). Your explanations for the incorrect choice correctly identify the real cost, such as paying the fan-out token multiplier on the lookup by choosing A, or forfeiting the Message Batches API's approximately 50% cost reduction by choosing a synchronous path for a non-urgent job.

### Other feedback branches

- **Partial:** You picked the right agent type but identified a lever that does not move the relevant constraint, or the reverse. The agent type and the lever are graded together for each scenario.
- **Revisit:** You chose orchestrator-worker (A) for a task that does not split into independent parts, so you paid the token multiplier for no parallel benefit. Or you tuned a lever that does not move that scenario's constraint, streaming a batch job, for example, where latency does not matter. Match parallel agents only to a research task that genuinely splits.
