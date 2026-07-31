---
module: 3
module_title: "Claude Code, MCP & Integration"
section: 5
section_title: "MCP Servers"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 5: match transport and scope to each deployment scenario"
duration: "4 min"
screen_id: "S14"
---

# Checkpoint 5: match transport and scope to each deployment scenario

Try it now. For each deployment scenario below, select the correct transport and scope.

Labelled configuration snippets are provided.

## Scenarios

1. A local SQLite query tool you use only on your development machine.
2. A code search service hosted on your company’s infrastructure that the whole engineering team should access.
3. An experimental web-scraping server you are testing this week against one specific repository, not ready to share.
4. A security-scanning server your organization’s IT team needs deployed to every developer’s Claude Code installation.

## Options

- HTTP + Project (.mcp.json)
- HTTP + Enterprise (managed settings)
- stdio + Local
- stdio or HTTP + Local

## Answer

| Scenario | Correct transport + scope |
|---|---|
| A local SQLite query tool you use only on your development machine. | stdio + Local |
| A code search service hosted on your company’s infrastructure that the whole engineering team should access. | HTTP + Project (.mcp.json) |
| An experimental web-scraping server you are testing this week against one specific repository, not ready to share. | stdio or HTTP + Local |
| A security-scanning server your organization’s IT team needs deployed to every developer’s Claude Code installation. | HTTP + Enterprise (managed settings) |

### Why

Right on all four. The decision logic: stdio is for servers that run on your machine only, while HTTP is for anything hosted remotely or accessed by more than one machine. Local scope keeps a server personal, project scope (.mcp.json) shares it with everyone who clones the repo, and enterprise scope deploys it administratively to all users.

### Other feedback branches

- **Partial:** A common miss is stdio for a remote server: stdio runs the server as a subprocess on your machine and cannot reach a service hosted on company infrastructure; HTTP is the right transport there. Another common miss is project scope for the personal experiment: project scope commits the server configuration to .mcp.json and shares it with everyone who clones the repo, but for an experiment you are not ready to share, local scope keeps the configuration personal and out of version control.
