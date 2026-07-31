---
module: 3
module_title: "Claude Code, MCP & Integration"
section: 6
section_title: "Enterprise Integration"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 6: diagnose the authentication failure from a trace"
duration: "3 min"
screen_id: "S17"
---

# Checkpoint 6: diagnose the authentication failure from a trace

Try it now: read the connection trace below.

Name the authentication failure mechanism, then select the correct targeted fix from three options.

### Connection trace

```text
[MCP Client] Connecting to https://data-api.internal/mcp ...
[MCP Client] GET /auth/token, 401 Unauthorized
[MCP Client] Reading credential from: /home/jenkins/.config/mcp-credentials.json
[MCP Client] Credential value: WAREHOUSE_TOKEN= sk-****[redacted]
[MCP Client] Retrying with credential, 401 Unauthorized
[MCP Client] Connection failed after 3 attempts
```

- **A.** Fix A: Rotate the API key and update /home/jenkins/.config/mcp-credentials.json with the new value.
- **B.** Fix B: Rotate the rejected key, then move the credential out of the file and inject it as an environment variable in the CI pipeline runner configuration. Update the MCP configuration to reference the variable.
- **C.** Fix C: Switch from API key authentication to OAuth for this service.

**Answer: B**

### Why

- **Fix A.** Rotating the key addresses the 401, because a fresh key is one the service will accept. It does not address the secret-handling defect the trace exposes. The new key is written back into the same file at the same known path as a plaintext value, so the storage pattern that caused the exposure is still in place and the next rotation reproduces it. The fix has to both replace the rejected key and move it out of the file, not just change the value living in that file.
- **Fix B.** The trace shows two problems stacked together. The 401 on both the first attempt and the retry tells you the key itself is being rejected, so the connection cannot authenticate until the key is replaced. The credential is also being read as a plaintext value from a file at a known path, which is the secret-handling defect this lesson warns about. Fix B handles both: it rotates the rejected key so the connection can authenticate, and it moves the new key out of the file into a runtime environment variable so it is never stored in plaintext again. Rotating alone (Fix A) clears the 401 but writes the replacement straight back into the same file, so the storage defect returns with the next rotation.
- **Fix C.** OAuth is the right pattern for remote services with user identity. A service account connection like this one uses a service credential, not a user sign-in, so OAuth does not match the identity model here. It also does not address what the trace actually shows, which is a rejected key stored insecurely. Switching authentication mechanisms is not the targeted fix this diagnosis calls for.
