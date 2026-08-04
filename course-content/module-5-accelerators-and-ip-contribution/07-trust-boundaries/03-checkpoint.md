---
module: 5
module_title: "Accelerators & IP Contribution"
section: 7
section_title: "Trust Boundaries"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 7: Complete the multi-component boundary configuration"
duration: "3 min"
screen_id: "S16"
---

# Checkpoint 7: Complete the multi-component boundary configuration

Try it now. The multi-component app below is wired, with two blanks left. Select the correct control for the seam that receives untrusted fetched content, and the correct identity scope for the most privileged component. The token bank is shared — two of the four tokens are distractors.

**The partial app**

```python
# components wired: API -> Claude Code task -> MCP server
fetched = code_task.run(fetch_url=customer_page)

# BLANK 1: control on the seam receiving untrusted fetched content
next_call(input=________(fetched))

# MCP server reaches the customer system (most privileged component)
mcp_server = MCPServer(
    system=customer_db,
    scope=________,   # BLANK 2: identity scope
)
```

### Blank 1 · The control on the seam receiving untrusted fetched content

- **A.** `treat_as_data`
- **B.** `least_privilege_read_only`
- **C.** `run_as_instructions`
- **D.** `full_access`

**Answer: A** — Wrapping the fetched content means the next component treats it as data rather than instructions. This closes the injection seam.

### Blank 2 · The identity scope on the most privileged component

- **A.** `treat_as_data`
- **B.** `least_privilege_read_only`
- **C.** `run_as_instructions`
- **D.** `full_access`

**Answer: B** — Scoping the most privileged component to least privilege means a steered action cannot reach beyond its task.

### Why

Blank 1 wraps the fetched content, so the next component treats it as data, rather than instructions. Blank 2 scopes the most privileged component to least privilege. Together they hold both boundaries under review. The two distractors are the two failure modes: `run_as_instructions` lets untrusted content cross as instructions, and `full_access` makes the privileged component the weak point for the whole app.

### Other feedback branches

- **Partial · one boundary closed:** You closed one boundary but left the other open. Treating fetched content as data without scoping the privileged component, or scoping it without guarding the fetched-content seam, still leaves the app only as contained as its weakest seam.
- **Incorrect:** The blank version lets untrusted fetched content cross as instructions, and an over-broad MCP scope makes that component the weak point for the whole app. Passing fetched content straight through, or scoping the server to full access, is what a review would reject.
