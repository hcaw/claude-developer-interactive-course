---
module: 3
module_title: "Claude Code, MCP & Integration"
section: 2
section_title: "Permission Modes & Human Gates"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 1: assemble the settings file and place the human gate"
duration: "4 min"
screen_id: "S04"
---

# Checkpoint 1: assemble the settings file and place the human gate

Try it now. You are configuring Claude Code for a trusted local refactor of the payments module.

The refactor should auto-approve file edits but must never run destructive shell commands, and the file `.env.production` must never be readable by the agent. Below are settings.json pieces.

### Part 1 · Select the settings.json pieces that assemble the correct configuration

Select two pieces.

- **A.** `{ "permissions": { "defaultMode": "default"} }`
- **B.** `{ "permissions": { "defaultMode": "bypassPermissions" } }`
- **C.** `{ "permissions": { "allow": ["Bash(npm run:*)"], "deny": ["Bash(rm:*)", "Bash(git push:*)"] } }`
- **D.** `{ "permissions": { "deny": ["Read(.env.production)"] } }`
- **E.** `{ "permissions": { "allow": ["Bash(*)", "Edit(*)"] } }`

**Answer: C, D** — C gates shell execution: it allows the safe npm run command and denies destructive shell commands (rm, git push), so the agent can edit and run safe commands but is blocked from destructive ones. D enforces the path restriction: the deny rule on .env.production holds at the settings layer regardless of what the agent is asked to do during the session.

### Part 2 · Place the human gate

Your settings allow the agent to edit files automatically. During the refactor the agent proposes a change to a deployment configuration file that several production services read. Where should a human gate sit for that one action? Select the single best answer.

- **A.** Nowhere: the settings already auto-approve edits, so let it run.
- **B.** A human reviews and approves the change to the deployment configuration file before the write executes, because a wrong value there is hard to undo and reaches systems outside the file.
- **C.** Add bypassPermissions so the agent never pauses.
- **D.** Review the change only after the write, during the next pull request.

**Answer: B** — Auto-approving edits is the right default for the trusted local refactor, but the worst-case question still governs the one high-cost action. A write to a deployment configuration file that several production services read is hard to undo and reaches beyond the file, so a person reviews and approves it before the write executes.

### Why

Pieces C and D together satisfy the scenario. Reads, searches, and navigation run without confirmation, file edits are allowed, and destructive shell commands are denied, while the deny rule on .env.production enforces the path restriction at the settings layer. (You might wonder about an auto-style classifier here: it would also catch a destructive command, but this scenario calls for deterministic, predictable shell-gating, which the explicit deny rule gives you without depending on a classifier’s judgment.)

The pieces that don't belong:

- **A.** This mode prompts before nearly every edit or command; it does not match the "auto-approve file edits" requirement in the scenario.
- **B.** With bypassPermissions set, the agent can run any shell command without confirmation, including destructive ones, and the protected-path guard is also removed. The scenario requires shell-command oversight.
- **E.** Allows every shell command with no destructive-command gate at all, the opposite of what the scenario requires.

### Other feedback branches

- **Check both parts:** Part 1 needs Pieces C and D together. Part 2 asks where the human gate belongs for a high-cost, hard-to-undo write. Option (A) treats the session default as if it answered the per-action question, which it does not; option (C) removes every prompt and the protected-path guard; option (D) reviews the change only after it has already reached production.
- **Revisit Part 1:** Without the deny rule on .env.production, the agent can read that file if it matches something in a broad operation. The deny rule is what enforces the path restriction at the configuration layer.
