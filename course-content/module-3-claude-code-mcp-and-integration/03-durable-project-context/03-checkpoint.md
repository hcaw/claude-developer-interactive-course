---
module: 3
module_title: "Claude Code, MCP & Integration"
section: 3
section_title: "Durable Project Context"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 2: drag the correct value"
duration: "3 min"
screen_id: "S07"
---

# Checkpoint 2: drag the correct value

Try it now. You are setting up a hook that enforces a path restriction, and the configuration below has two blanks.

Select the correct one: the lifecycle event that runs before a tool call executes, and the command the hook runs to block reads of `.env.production`.

```json
{
  "hooks": {
    "________": [
      {
        "matcher": "Read",
        "hooks": [{ "type": "command", "command": "________" }]
      }
    ]
  }
}
```

### Blank 1: the lifecycle event

- PreToolUse
- PostToolUse
- UserPromptSubmit
- SessionStart

### Blank 2: the command

- A script that reads the tool call from stdin, checks the file path, and exits with code 2 when the path is .env.production (writing the reason to stderr).
- A script that logs the tool call to an audit file and exits 0.
- A script that prints a warning and exits 0 unconditionally.

### Answer

| Blank | Correct value |
|---|---|
| Blank 1: the lifecycle event | PreToolUse |
| Blank 2: the command | A script that reads the tool call from stdin, checks the file path, and exits with code 2 when the path is .env.production (writing the reason to stderr). |

### Why

PreToolUse fires before the tool call executes, which is when blocking is possible. A PostToolUse hook cannot block because the tool has already run. The command reads the tool call from stdin, checks the file path, and exits with code 2 to block it, and anything written to stderr becomes the message Claude sees.

### Other feedback branches

- **Incorrect:** PostToolUse fires after the tool has already executed, so a hook on that event cannot prevent the read from happening. You need the event that intercepts the tool call before it runs, which is PreToolUse.
- **Partial: correct event, wrong command:** The event is right. The command needs to read the tool call input, inspect the file path, and exit with code 2 when the path matches the protected file. A command that exits 0 unconditionally lets everything through.
