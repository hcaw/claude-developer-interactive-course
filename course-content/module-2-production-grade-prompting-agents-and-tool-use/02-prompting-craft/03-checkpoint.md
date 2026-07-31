---
module: 2
module_title: "Production-Grade Prompting, Agents & Tool Use"
section: 2
section_title: "Prompting Craft"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 1 · Fix the broken prompt"
duration: "4 min"
screen_id: "S04"
---

# Checkpoint 1 · Fix the broken prompt

The prompt shown here extracts a JSON object from a support ticket with three fields: category, urgency, and a one-sentence summary. It contains one defect. Write the corrected system prompt that fixes it.

**Broken prompt**

```text
System: "You are a support ticket processor. Extract the key information from the ticket below."

User: <ticket>My API key stopped working after I rotated it last night. I have a production deployment that is failing. This needs to be fixed immediately.</ticket>
```

### Model answer

```text
System: "You are a support ticket processor. Extract the key information from each ticket and return only a JSON object with exactly these three fields: category (one of: billing, technical, escalation), urgency (one of: low, medium, high, critical), and summary (a single sentence describing the issue). Return only the JSON object. No other text."
User: <ticket>My API key stopped working after I rotated it last night. I have a production deployment that is failing. This needs to be fixed immediately.</ticket>
```

Expected output: {"category": "technical", "urgency": "critical", "summary": "Developer's API key stopped working after rotation, causing a production deployment failure that needs immediate resolution."}

### Why

The defect was a missing output constraint. The original system prompt never specified the JSON structure, the exact field names, their allowed values, or the instruction to return nothing else. Without that contract, Claude returns plausible but inconsistent output that breaks any downstream parser expecting a specific schema.
