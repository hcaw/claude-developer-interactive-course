---
module: 1
module_title: "MSO Foundations"
section: 6
section_title: "Module Wrap-up"
article: 2
article_type: "Exercise"
title: "Exercise: predict the behavior"
duration: "6 min"
screen_id: "S07"
---

# Exercise: predict the behavior

Try it now. Each scenario below presents a configuration drawn from one of this module’s four foundations, sampling, prompting mode, request shape, and the context budget. For each one, select the answer that predicts the correct behavior and identifies the reason why. Partial credit is available when you answer three of four correctly.

### Scenario 1

Consider a classification task run at temperature 0 versus the same task run at a high temperature. Predict how the outputs differ across repeated runs.

- **A.** At a low temperature, the model concentrates probability on the most likely tokens, so repeated runs return the same label far more consistently, though never with guaranteed determinism, even at temperature 0. At a high temperature, the distribution spreads out, so wording and even the chosen label can vary. For a classifier you want the low-temperature, repeatable behavior.
- **B.** Both configurations return identical output every run, because temperature only affects response length, not which tokens are chosen.
- **C.** The high-temperature run is more accurate, because spreading the distribution lets the model consider more of the correct answers.
- **D.** Temperature has no effect on a classification task, because classification always returns a fixed label regardless of sampling.

**Answer: A** — Temperature shapes the probability distribution the model samples from, it does not fix or disable the output. Lower temperature concentrates probability on the most likely tokens, making repeated runs far more consistent (identical outputs are never guaranteed, even at temperature 0), which is what a classifier needs. On the newest models, sampling parameters are omitted entirely. Non-default values return an error, and repeatability is managed through prompt design. Higher temperature spreads the distribution and lets the label and wording vary.

### Scenario 2

Consider a task that keeps returning output in the wrong structure under a zero-shot prompt. Predict what changes if you switch to multi-shot.

- **A.** Switching to multi-shot retrains the model on the new structure, so the change is permanent across every future call once the examples are sent.
- **B.** Adding two or three correct input-output examples shows the model the exact structure to match, which usually fixes a structure problem that more instruction text did not. The cost is extra tokens on every call, so add the fewest examples that make the output reliable.
- **C.** Multi-shot will not help a structure problem; only raising the temperature changes the shape of the output.
- **D.** Multi-shot lowers the token cost per call, because examples let the model produce shorter responses.

**Answer: B** — Examples in a prompt are not training and do not lower cost. They sit in the prompt, demonstrate the exact output shape, and add tokens on every call. Reach for multi-shot when the structure is wrong, and add the fewest examples that make the output reliable.

### Scenario 3

Consider a pipeline that must process 50,000 documents overnight with no user waiting. Predict which request shape fits and why.

- **A.** A synchronous loop fits best, because calling the API once per document is the simplest pattern and avoids the overhead of submitting a batch.
- **B.** Streaming fits best, because sending the response in pieces lets the pipeline start processing each document sooner.
- **C.** The batch pattern fits: submit the requests in a batch and poll for completion, accepting longer latency for a lower per-token cost. A synchronous loop would hit rate limits and tie up the application, and streaming buys nothing because no user is watching.
- **D.** A larger context window fits best, because fitting all 50,000 documents into one request avoids making repeated calls.

**Answer: C** — Match the request shape to whether a user is waiting. With no user watching and tens of thousands of inputs, the Message Batches API is the right fit: submit the requests in one call, poll for completion, and accept longer latency in exchange for a lower per-token cost. A synchronous loop hits rate limits at this volume. Streaming only helps when someone is watching the output arrive.

### Scenario 4

Consider a long multi-turn agent session whose context window keeps filling. Predict the symptoms and name the budget at fault.

- **A.** The model silently drops the oldest turns to make room, so the session continues but quietly loses early context without any error.
- **B.** The context window is a fixed token budget; as history and tool results accumulate it fills. An input that is already oversized is rejected with an error before generation, while a request that fits on input but reaches the ceiling mid-generation comes back with truncated output and a model_context_window_exceeded stop reason. The symptom is a session that ran fine in testing failing once inputs grow, which is why the application must trim or summarize history.
- **C.** The symptom is slower sampling, and the budget at fault is the temperature setting, which must be lowered as the session grows.
- **D.** There is no fixed budget; the window expands automatically to hold whatever history accumulates, so a long session never fails for this reason.

**Answer: B** — The context window is a fixed budget. An oversized input is rejected with an error before generation; a request that reaches the ceiling mid-generation instead comes back truncated with a model_context_window_exceeded stop reason. The oldest content is never silently dropped. The symptom is a session that passed in testing failing once inputs and turns grow, which is why trimming or summarizing history is the application's job.
