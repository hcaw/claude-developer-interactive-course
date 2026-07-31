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

Try it now. Three teams want to reuse the same review-checklist skill in different places.

For each, match what must be configured for the skill to load and run. Note: the source presents four runtime situations. All four are included here so the match stays complete.

## Situations

1. A developer wants the skill to load when they ask for a review in the Claude Code terminal.
2. A service calls the Messages API and wants the skill to run as part of the request.
3. A scheduled headless job uses Agent SDK and expects the skill from the repo to load.
4. A product team wants the same review-checklist skill to run inside a long-running agent that Anthropic hosts, reachable by an agent ID across sessions.

## Options

- Enable filesystem sources by setting settingSources explicitly so the agent loads skills from the project. Do not rely on a default, and confirm current default behavior against the Agent SDK reference at build time.
- Place SKILL.md in .claude/skills with a description that matches review requests.
- Define the agent as an API resource that lists the skill and set the managed-agents-2026-04-01 beta header on the calls. Write the skill so its steps do not depend on local files, because it will run in Anthropic’s sandbox.
- Send the code-execution and skills beta headers and write the skill so its steps do not depend on local files or local tools.

## Answer

| Situation | Correct configuration |
|---|---|
| A developer wants the skill to load when they ask for a review in the Claude Code terminal. | Place SKILL.md in .claude/skills with a description that matches review requests. |
| A service calls the Messages API and wants the skill to run as part of the request. | Send the code-execution and skills beta headers and write the skill so its steps do not depend on local files or local tools. |
| A scheduled headless job uses Agent SDK and expects the skill from the repo to load. | Enable filesystem sources by setting settingSources explicitly so the agent loads skills from the project. Do not rely on a default, and confirm current default behavior against the Agent SDK reference at build time. |
| A product team wants the same review-checklist skill to run inside a long-running agent that Anthropic hosts, reachable by an agent ID across sessions. | Define the agent as an API resource that lists the skill and set the managed-agents-2026-04-01 beta header on the calls. Write the skill so its steps do not depend on local files, because it will run in Anthropic’s sandbox. |

### Why

- **A developer wants the skill to load when they ask for a review in the Claude Code terminal.** — This is the filesystem-discovery runtime: Claude Code.
- **A service calls the Messages API and wants the skill to run as part of the request.** — The Messages API runs the skill inside Anthropic’s code execution container, not your machine.
- **A scheduled headless job uses Agent SDK and expects the skill from the repo to load.** — Whether filesystem settings load in the Agent SDK is controlled by the settingSources configuration; set it explicitly rather than relying on a default.
- **A product team wants the same review-checklist skill to run inside a long-running agent that Anthropic hosts, reachable by an agent ID across sessions.** — Claude Managed Agents load the skill server-side as part of the agent resource definition.

Each situation is matched to the one configuration that makes the skill load in that runtime. The common thread: the same SKILL.md is portable, but each runtime discovers and sandboxes it differently, so “runs everywhere” is something you configure for, not something you get for free.

### Other feedback branches

- **Partial:** A mismatch usually swaps the filesystem-based runtimes for the request-based ones. Ask where the skill physically runs: on your machine and files (Claude Code), inside Anthropic’s execution container (Messages API), in the SDK’s process once filesystem sources are enabled, or in a managed sandbox (hosted agent). The required configuration follows from where it runs.
