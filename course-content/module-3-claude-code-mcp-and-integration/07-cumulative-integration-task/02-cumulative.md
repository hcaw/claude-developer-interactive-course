---
module: 3
module_title: "Claude Code, MCP & Integration"
section: 7
section_title: "Cumulative Integration Task"
article: 2
article_type: "Cumulative"
title: "Cumulative integration task: assembly"
duration: "6 min"
screen_id: "S19"
---

# Cumulative integration task: assembly

Now write the corrected version of all three files.

Produce the complete corrected content for settings.json, SKILL.md, and .mcp.json.

> Write the corrected content for all three files…

### Model answer

**File 1: settings.json (corrected)**

```json
{ "permissions": { "defaultMode": "acceptEdits", "deny": ["Read(.env.production)"] } }
```

**File 2: SKILL.md (corrected)**

```markdown
---
name: migration-validate
description: Validates migration scripts before they run against production.
---
## Steps
1. Run: $CLAUDE_PROJECT_DIR/scripts/validate-migration.sh
2. Report validation results.
```

**File 3: .mcp.json (corrected)**

```json
{
  "mcpServers": {
    "data-warehouse": {
      "type": "http",
      "url": "https://warehouse.internal/mcp",
      "headers": {
        "Authorization": "Bearer ${WAREHOUSE_MCP_TOKEN}"
      }
    }
  }
}
```

settings.json sets `defaultMode` to `acceptEdits` inside `permissions`; auto-approves file edits and common filesystem commands but gates destructive shell commands, the right tradeoff for a production migration workstation. The skill uses `$CLAUDE_PROJECT_DIR` so the path resolves from the project root on any machine after cloning. The MCP configuration references the credential as an environment variable so it is never committed to repository history.

How did your assembly compare?

### Why

The settings file keeps defaultMode inside permissions and sets it to acceptEdits, the skill uses a project-relative path variable, and the MCP configuration references the credential as an environment variable.
