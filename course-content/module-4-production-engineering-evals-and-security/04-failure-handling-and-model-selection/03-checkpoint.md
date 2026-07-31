---
module: 4
module_title: "Production Engineering, Evals & Security"
section: 4
section_title: "Failure Handling & Model Selection"
article: 3
article_type: "Checkpoint"
title: "Repair the broken error and retry path"
duration: "8 min"
screen_id: "S10"
---

# Repair the broken error and retry path

The block below has one defect. Identify it and write the corrected version.

**Broken code shown to the learner**

```python
def call_with_retry(make_call, max_attempts=5):
    for attempt in range(max_attempts):
        try:
            return make_call()
        except Exception:
            time.sleep(0)
    raise RetryBudgetExhausted()
```

### Model answer

**The defect:** there is no backoff between attempts, time.sleep(0) fires retries immediately. The loop also retries every exception including terminal statuses like 400 that a retry cannot fix. Against a rate limit, each instant retry counts as another request and deepens the limit rather than waiting for it to clear.

**Corrected version:**

```python
def call_with_retry(make_call, max_attempts=5, cap=30):
    for attempt in range(max_attempts):
        try:
            return make_call()
        except anthropic.RateLimitError as e:
            wait = e.response.headers.get("retry-after")
            if wait is None:
                wait = min(cap, 2 ** attempt) + random.uniform(0, 1)
            time.sleep(float(wait))
        except anthropic.APIStatusError as e:
            if not is_retriable(e.status_code):
                raise                        # fail fast on terminal
            time.sleep(min(cap, 2 ** attempt) + random.uniform(0, 1))
    raise RetryBudgetExhausted()
```

**The three fixes:** (1) honors retry-after from the response header before falling back to exponential backoff; (2) grows the wait interval between attempts with a cap; (3) fails fast on terminal statuses (400, 401, 403, 404) rather than retrying a request that will fail identically.
