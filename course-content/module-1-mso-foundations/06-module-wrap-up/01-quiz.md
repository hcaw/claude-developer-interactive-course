---
module: 1
module_title: "MSO Foundations"
section: 6
section_title: "Module Wrap-up"
article: 1
article_type: "Quiz"
title: "Module quiz"
duration: "5 min"
screen_id: "S06"
---

# Module quiz

Try it now. Here are some multiple-choice questions to test your understanding of the course so far.

### Question 1

A teammate says two identical prompts must return identical text. What is the most accurate response?

- **A.** That is true, the model is deterministic.
- **B.** Not necessarily, the model samples each next token from a probability distribution, so wording can vary even when both answers are correct.
- **C.** That is only true if streaming is off.
- **D.** That is only true on the largest model.

**Answer: B** — Sampling makes generation non-deterministic, which is why tests assert on properties and meaning rather than exact text.

### Question 2

Which statement best separates model choice from reasoning mode?

- **A.** They are the same setting.
- **B.** Extended thinking is a different model.
- **C.** Model choice picks which member of the family runs; extended thinking is a per-call setting that any supporting model can run with on or off.
- **D.** Reasoning mode is fixed per account.

**Answer: C** — The two levers are independent but can work together.

### Question 3

A short, well-specified classification task returns the right answer zero-shot. What does adding three examples most likely do?

- **A.** Improves accuracy substantially.
- **B.** Adds token cost on every call for little or no gain.
- **C.** Changes the model being used.
- **D.** Disables sampling.

**Answer: B** — Add examples when the output shape is wrong, not when zero-shot already works.

### Question 4

You must process thousands of inputs offline at the lowest cost. Which shape fits?

- **A.** Synchronous calls in a loop.
- **B.** Streaming.
- **C.** Batch submission with polling.
- **D.** A larger context window.

**Answer: C** — Batch trades latency for lower per-token cost and avoids the rate limits a synchronous loop hits.
