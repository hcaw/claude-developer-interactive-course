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

### Scenario 1 · A local SQLite query tool you use only on your development machine

- **A.** HTTP + Project (.mcp.json)
- **B.** HTTP + Enterprise (managed settings)
- **C.** stdio + Local
- **D.** stdio or HTTP + Local

**Answer: C** — stdio runs the server as a subprocess on your machine, and local scope keeps a personal tool personal.

### Scenario 2 · A code search service hosted on your company’s infrastructure that the whole engineering team should access

- **A.** HTTP + Project (.mcp.json)
- **B.** HTTP + Enterprise (managed settings)
- **C.** stdio + Local
- **D.** stdio or HTTP + Local

**Answer: A** — HTTP is the transport for a service hosted on company infrastructure, and project scope (.mcp.json) shares the configuration with everyone who clones the repo.

### Scenario 3 · An experimental web-scraping server you are testing this week against one specific repository, not ready to share

- **A.** HTTP + Project (.mcp.json)
- **B.** HTTP + Enterprise (managed settings)
- **C.** stdio + Local
- **D.** stdio or HTTP + Local

**Answer: D** — An experiment can run over either transport, but local scope is what keeps the configuration personal and out of version control until it is ready to share.

### Scenario 4 · A security-scanning server your organization’s IT team needs deployed to every developer’s Claude Code installation

- **A.** HTTP + Project (.mcp.json)
- **B.** HTTP + Enterprise (managed settings)
- **C.** stdio + Local
- **D.** stdio or HTTP + Local

**Answer: B** — Enterprise scope deploys the server administratively to every installation, and HTTP reaches the centrally hosted service.

### Why

The decision logic: stdio is for servers that run on your machine only, while HTTP is for anything hosted remotely or accessed by more than one machine. Local scope keeps a server personal, project scope (.mcp.json) shares it with everyone who clones the repo, and enterprise scope deploys it administratively to all users.

### Other feedback branches

- **Partial:** A common miss is stdio for a remote server: stdio runs the server as a subprocess on your machine and cannot reach a service hosted on company infrastructure; HTTP is the right transport there. Another common miss is project scope for the personal experiment: project scope commits the server configuration to .mcp.json and shares it with everyone who clones the repo, but for an experiment you are not ready to share, local scope keeps the configuration personal and out of version control.
