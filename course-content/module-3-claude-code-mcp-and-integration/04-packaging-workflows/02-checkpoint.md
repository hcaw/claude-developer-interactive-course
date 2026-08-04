---
module: 3
module_title: "Claude Code, MCP & Integration"
section: 4
section_title: "Packaging Workflows"
article: 2
article_type: "Checkpoint"
title: "Checkpoint 3: place the skill in the right runtime"
duration: "3 min"
screen_id: "S09"
---

# Checkpoint 3: place the skill in the right runtime

Try it now. Four teams want to reuse the same review-checklist skill in different places.

For each situation below, select the configuration that makes the skill load and run in that runtime.

### Situation 1 · A developer wants the skill to load when they ask for a review in the Claude Code terminal

- **A.** Enable filesystem sources by setting settingSources explicitly so the agent loads skills from the project. Do not rely on a default, and confirm current default behavior against the Agent SDK reference at build time.
- **B.** Place SKILL.md in .claude/skills with a description that matches review requests.
- **C.** Define the agent as an API resource that lists the skill and set the managed-agents-2026-04-01 beta header on the calls. Write the skill so its steps do not depend on local files, because it will run in Anthropic’s sandbox.
- **D.** Send the code-execution and skills beta headers and write the skill so its steps do not depend on local files or local tools.

**Answer: B** — This is the filesystem-discovery runtime: Claude Code finds SKILL.md in .claude/skills and loads it when the description matches the request.

### Situation 2 · A service calls the Messages API and wants the skill to run as part of the request

- **A.** Enable filesystem sources by setting settingSources explicitly so the agent loads skills from the project. Do not rely on a default, and confirm current default behavior against the Agent SDK reference at build time.
- **B.** Place SKILL.md in .claude/skills with a description that matches review requests.
- **C.** Define the agent as an API resource that lists the skill and set the managed-agents-2026-04-01 beta header on the calls. Write the skill so its steps do not depend on local files, because it will run in Anthropic’s sandbox.
- **D.** Send the code-execution and skills beta headers and write the skill so its steps do not depend on local files or local tools.

**Answer: D** — The Messages API runs the skill inside Anthropic’s code execution container, not your machine, so the beta headers enable it and the skill must not depend on local files or tools.

### Situation 3 · A scheduled headless job uses Agent SDK and expects the skill from the repo to load

- **A.** Enable filesystem sources by setting settingSources explicitly so the agent loads skills from the project. Do not rely on a default, and confirm current default behavior against the Agent SDK reference at build time.
- **B.** Place SKILL.md in .claude/skills with a description that matches review requests.
- **C.** Define the agent as an API resource that lists the skill and set the managed-agents-2026-04-01 beta header on the calls. Write the skill so its steps do not depend on local files, because it will run in Anthropic’s sandbox.
- **D.** Send the code-execution and skills beta headers and write the skill so its steps do not depend on local files or local tools.

**Answer: A** — Whether filesystem settings load in the Agent SDK is controlled by the settingSources configuration; set it explicitly rather than relying on a default.

### Situation 4 · A product team wants the same review-checklist skill to run inside a long-running agent that Anthropic hosts, reachable by an agent ID across sessions

- **A.** Enable filesystem sources by setting settingSources explicitly so the agent loads skills from the project. Do not rely on a default, and confirm current default behavior against the Agent SDK reference at build time.
- **B.** Place SKILL.md in .claude/skills with a description that matches review requests.
- **C.** Define the agent as an API resource that lists the skill and set the managed-agents-2026-04-01 beta header on the calls. Write the skill so its steps do not depend on local files, because it will run in Anthropic’s sandbox.
- **D.** Send the code-execution and skills beta headers and write the skill so its steps do not depend on local files or local tools.

**Answer: C** — Claude Managed Agents load the skill server-side as part of the agent resource definition, and the managed sandbox is why the skill cannot depend on local files.

### Why

Each situation is matched to the one configuration that makes the skill load in that runtime. The common thread: the same SKILL.md is portable, but each runtime discovers and sandboxes it differently, so “runs everywhere” is something you configure for, not something you get for free.

### Other feedback branches

- **Partial:** A mismatch usually swaps the filesystem-based runtimes for the request-based ones. Ask where the skill physically runs: on your machine and files (Claude Code), inside Anthropic’s execution container (Messages API), in the SDK’s process once filesystem sources are enabled, or in a managed sandbox (hosted agent). The required configuration follows from where it runs.
