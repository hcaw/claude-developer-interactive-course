---
module: 4
module_title: "Production Engineering, Evals & Security"
section: 3
section_title: "Testing & Tracing"
article: 3
article_type: "Checkpoint"
title: "Diagnose which test level a failure belongs to"
duration: "10 min"
screen_id: "S07"
---

# Diagnose which test level a failure belongs to

Try it now. Read the trace below, where the end-to-end test fails while every unit test passes. Identify where the break is, name the mechanism, and choose both the targeted fix and the test level that would have caught it from the three options shown.

```text
PASS  test_retrieve_unit           returns 3 chunks for a known query
PASS  test_model_call_functional   returns a well-formed answer string
FAIL  test_full_flow_e2e
  step 1 retrieve(q)         ok   -> [{"content": "..."}, ...]
  step 2 build_prompt(chunks) ok  -> chunks placed without .content
  step 3 model.call(prompt)  ok   -> answer unrelated to the documents
  step 4 assert "30 days"    FAIL -> phrase not in answer
```

### Option A · fix the parser

```python
def parse_date(s): return dateutil.parse(s)   # already passes its unit test
```

### Option B · fix the prompt wording

```python
prompt = "Answer carefully and cite the policy."  # rewords, ignores the seam
```

### Option C · align the handoff + add an integration test

```python
context = "\n".join(c["content"] for c in chunks)  # extract .content
prompt  = build_prompt(question, context)
# new test drives retrieve() -> build_prompt() together on real chunks
```

- **A.** Fix the parser (dateutil.parse already passes its unit test)
- **B.** Fix the prompt wording ("Answer carefully and cite the policy")
- **C.** Align the handoff and add an integration test on retrieve() -> build_prompt()

**Answer: C** — The trace shows both components passing alone, so the failure can only live in the handoff: retrieve() returns chunk dicts and build_prompt() never reads the content field, so the model got malformed context. Option C extracts the content and adds a test on that exact seam. This is the integration level.

### Why

You chose Option C and named the integration level. The trace shows both components passing alone, so the failure can only live in the handoff: retrieve() returns chunk dicts and build_prompt() never reads the content field, so the model got malformed context. Option C extracts the content and adds a test on that exact seam.

| Option | Why |
|---|---|
| A | The parser already passes its unit test in the trace. A component that passes in isolation is not where an end-to-end-only failure lives. |
| B | The model call passes its functional test in the trace. Rewording the prompt ignores the seam where chunks are placed into the prompt without reading the content field. |
