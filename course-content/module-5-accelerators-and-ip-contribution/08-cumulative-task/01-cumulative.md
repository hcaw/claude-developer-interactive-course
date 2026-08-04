---
module: 5
module_title: "Accelerators & IP Contribution"
section: 8
section_title: "Cumulative Task"
article: 1
article_type: "Cumulative"
title: "Cumulative task: Find all three, explain each, write the correction"
duration: "6 min"
screen_id: "S17"
---

# Cumulative task: Find all three, explain each, write the correction

Below is a runnable packaged accelerator deployed across platforms. There are three planted defects: one in the packaging layer, one in the deployment-and-versioning layer, and one in the multi-component boundary layer. Your task is to find all three.

**The deployment as shipped**

```python
# Packaged code-review accelerator, deployed for a regulated AWS customer
def build_agent():
    return Agent(
        model="opus",
        system_prompt=SYSTEM_PROMPT,
        repo_path="/home/acme/checkout",
        tools=[read_file, run_linter],
    )

deploy(platform="amazon_bedrock", identity=aws_role_arn)

# multi-component step: Claude Code task fetches a customer page
fetched = code_task.run(fetch_url=customer_page)
next_call(input=fetched)
```

*Carry your three corrected lines into the next page, where you assemble and verify the fixed deployment.*

In your own words, identify all three defects.

> Defect 1 (packaging): …
> Defect 2 (deployment/versioning): …
> Defect 3 (multi-component boundary): …

### Model answer · self-assess

**Defect 1 (packaging):** the repo_path is hardcoded instead of parameterized; a new engagement cannot configure it without editing the loop.

**Defect 2 (deployment/versioning):** model="opus" is a moving alias, not a pinned full model ID, and there is no retained prior version to roll back to.

**Defect 3 (multi-component boundary):** fetched content from the Claude Code task is passed straight into next_call as if it were trusted instructions, instead of being wrapped so the next component treats it as data.

### Other feedback branches

- **Pass:** All three defects identified: hardcoded repo_path, unpinned moving alias with no retained version, and fetched content passed as instructions.
- **Retry:** Re-check the three layers: packaging (parameterization), deployment/versioning (pinning + rollback), and the multi-component boundary (treating fetched content as data).
