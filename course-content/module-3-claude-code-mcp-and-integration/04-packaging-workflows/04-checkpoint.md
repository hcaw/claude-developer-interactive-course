---
module: 3
module_title: "Claude Code, MCP & Integration"
section: 4
section_title: "Packaging Workflows"
article: 4
article_type: "Checkpoint"
title: "Checkpoint 4: fix the broken plugin definition"
duration: "4 min"
screen_id: "S11"
---

# Checkpoint 4: fix the broken plugin definition

Try it now. The following SKILL.md works on the author’s machine but will fail when a teammate clones the project and installs the plugin.

Select the single defect, then select the correct fix.

```text
---
name: deploy-validate
description: Validates a deployment configuration before release.
---
## Steps
1. Run the validation script: /Users/alexmorgan/projects/deploy-utils/validate.sh         absolute path
2. If the script exits with a non-zero code, report the error to the developer.
3. If validation passes, confirm the deployment configuration is safe to proceed.
```

### Part 1 · Which is the defect?

- **A.** The skill name does not match the plugin name.
- **B.** The description is too short for the model to match.
- **C.** The absolute path /Users/alexmorgan/projects/deploy-utils/validate.sh in step 1.
- **D.** Step 2 should report to the user, not the developer.

**Answer: C**

### Part 2 · Which is the correct fix?

- **A.** Reference the script from the project root using CLAUDE_PROJECT_DIR, so it resolves no matter where the project is cloned.
- **B.** Replace the path with another absolute path that points to a shared network drive.
- **C.** Replace the path with a home-directory shortcut: ~/projects/deploy-utils/validate.sh.
- **D.** Remove step 1 so the skill no longer calls an external script.

**Answer: A**

### Why

The defect is the absolute path /Users/alexmorgan/projects/deploy-utils/validate.sh in step 1. It resolves to the author’s home directory, and a teammate who clones the repo to a different location has no such path, so the script reference fails. The fix is to reference the script relative to the project root using CLAUDE_PROJECT_DIR (or the equivalent variable), so the location resolves from the repo root no matter where the project is cloned.

### Other feedback branches

- **Partial: right defect, wrong fix:** You found the defect. The corrected version needs a path that resolves from the project root on any machine, using CLAUDE_PROJECT_DIR, not another absolute path and not a home-directory shortcut, both of which still depend on a specific machine’s layout.
- **Incorrect: wrong defect:** That is not where the install breaks. The name, description, and step structure are all correct. Look again at the specific path in step 1 and ask whether that exact path would resolve on a machine where the project is cloned to a different directory than the author’s.
