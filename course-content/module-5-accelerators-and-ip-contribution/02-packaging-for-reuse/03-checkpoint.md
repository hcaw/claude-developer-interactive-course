---
module: 5
module_title: "Accelerators & IP Contribution"
section: 2
section_title: "Packaging for Reuse"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 1: Fix the broken accelerator template"
duration: "4 min"
screen_id: "S04"
---

# Checkpoint 1: Fix the broken accelerator template

Try it now. Below is an agent template another team is supposed to reuse. It has one defect: a customer-specific value is hardcoded where a parameter belongs.

**The template as shipped**

```python
# agent_template.py  : "reusable" code-review agent
def build_review_agent():
    return Agent(
        model="claude-opus-4-8",
        system_prompt=SYSTEM_PROMPT,
        tools=[read_file, run_linter],
        repo_path="/home/acme/checkout-service",   # customer repo
    )
```

(Confirm current model ID at platform.claude.com/docs/en/about-claude/models at build time.)

Identify the hardcoded value, then write the corrected function signature and the parameterized line that replaces it.

### Model answer

```python
def build_review_agent(repo_path):
    return Agent(
        model="claude-opus-4-8",
        system_prompt=SYSTEM_PROMPT,
        tools=[read_file, run_linter],
        repo_path=repo_path,   # set per engagement
    )
```

### Why

The hardcoded repo_path is the defect. A reusable template takes the customer-specific value as a parameter, so the next team configures the asset instead of editing the code. That is the difference between a template that runs and a template that reuses.
