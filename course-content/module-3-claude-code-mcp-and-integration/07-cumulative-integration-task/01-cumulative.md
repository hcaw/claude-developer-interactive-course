---
module: 3
module_title: "Claude Code, MCP & Integration"
section: 7
section_title: "Cumulative Integration Task"
article: 1
article_type: "Cumulative"
title: "Cumulative integration task: checkpoint"
duration: "6 min"
screen_id: "S18"
---

# Cumulative integration task: checkpoint

The integration below has three bugs planted across the layers this module covers: one in the Claude Code configuration layer, one in the plugin or packaging layer, and one in the MCP or authentication layer.

For each file: identify the bug and write one sentence describing what it does or fails to do at runtime.

**File 1: .claude/settings.json**

```json
{ "permissions": { "defaultMode": "bypassPermissions", "deny": ["Read(.env.production)"] } }
```

**File 2: .claude/skills/migration-validate/SKILL.md**

```markdown
---
name: migration-validate
description: Validates migration scripts before they run against production.
---
## Steps
1. Run: /Users/priya/scripts/validate-migration.sh
2. Report validation results.
```

**File 3: .mcp.json**

```json
{
  "mcpServers": {
    "data-warehouse": {
      "type": "http",
      "url": "https://warehouse.internal/mcp",
      "headers": {
        "Authorization": "Bearer sk-prod-warehouse-abc123"
      }
    }
  }
}
```

> For each file, name the bug and write one sentence describing what it does or fails to do at runtime…

### Model answer

**File 1 (settings.json):** `defaultMode` is `bypassPermissions`; removes every confirmation prompt on a production workstation, including for destructive operations. The deny rule for `.env.production` is correct; only the mode is wrong.

**File 2 (SKILL.md):** Step 1 uses an absolute path `/Users/priya/scripts/validate-migration.sh`; this path exists only on the author’s machine and will not resolve on any teammate’s machine after they clone the project.

**File 3 (.mcp.json):** The API key `sk-prod-warehouse-abc123` is committed inline in the Authorization header; it enters repository history where it cannot be removed by overwriting the file in a later commit, and must be treated as compromised.

How many did you catch?

### Why

Bug 1 is bypassPermissions on a production workstation, the mode removes the safety prompts the migration requires. Bug 2 is an absolute path in the skill, it resolves on the author’s machine and nowhere else. Bug 3 is an inline API key in .mcp.json, once committed it lives in repository history regardless of later edits.
