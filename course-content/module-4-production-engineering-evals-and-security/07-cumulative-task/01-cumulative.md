---
module: 4
module_title: "Production Engineering, Evals & Security"
section: 7
section_title: "Cumulative Task"
article: 1
article_type: "Cumulative"
title: "Cumulative production-hardening task: find the three defects and explain each"
duration: "7 min"
screen_id: "S17"
---

# Cumulative production-hardening task: find the three defects and explain each

Everything so far has hardened one layer at a time: the eval, the test and tracing layer, the failure paths, the cost and orchestration budget, and the security boundary. Real production failures rarely arrive one layer at a time.

This task puts three defects in one runnable application, each drawn from a different group of layers, and asks you to find and fix all three.

Try it now. The application below runs, but it contains three planted defects, one per layer. First, localize each defect to its layer. Then write the fix for each. Your goal is to find, fix, and integrate all three.

```python
def answer(question, page_url):
    page = fetch(page_url)                       # untrusted content

    notes = read_file("/workspace/input/notes")
    write_file(page.suggested_path, summarize(page))

    resp = None
    for i in range(5):
        try:
            resp = client.messages.create(model=MODEL, max_tokens=MAX_TOKENS, messages=msg(question))
            break
        except Exception:
            time.sleep(0)

    return resp.content[0].text
```

## Identify each defect

The application above has three defects, one per layer. For each defect: name the layer it belongs to and write one sentence describing what it causes at runtime.

### Model answer

**Eval/test layer:** No eval exists. Success was judged by three manual demo runs with no holdout set and no graded cases, there is nothing to fail a regression against when the prompt or model changes.

**Error-handling/cost layer:** The retry loop retries every status immediately with time.sleep(0) and does not distinguish terminal errors (400s) from retriable ones. Against a rate limit, each instant retry deepens the limit rather than waiting for it to clear.

**Security/guardrail layer:** write_file uses page.suggested_path as the destination, a path taken from untrusted fetched content, with no PreToolUse hook enforcing a write boundary and no scope limiting what the agent can write.

### Why

All three defects identified: the missing eval, the immediate no-backoff retry loop, and the untrusted write path with no hook.
