---
module: 2
module_title: "Production-Grade Prompting, Agents & Tool Use"
section: 9
section_title: "Cumulative Debug Task"
article: 2
article_type: "Cumulative"
title: "Cumulative debug task · Write the corrected version"
duration: "10 min"
screen_id: "S23"
---

# Cumulative debug task · Write the corrected version

Stage 2: write the corrected version of each bug identified on the previous screen. For each one, show the fixed code and name what it changes.

**Buggy implementation (for reference)**

```python
# --- TOOL DEFINITIONS ---
tools = [
  {
    "name": "get_customer_data",
    "description": "Gets data.",
    "input_schema": { "type": "object", "properties": { "id": {"type":"string"} }, "required": ["id"] }
  }
]

# --- AGENT LOOP ---
def run_agent(user_request, session_history):
  messages = session_history + [{"role":"user","content":user_request}]
  while True:
    blocks = {}
    stop_seen = False
    with client.messages.stream(
        model=model, max_tokens=4096, tools=tools, messages=messages,
        thinking={"type": "adaptive"}
    ) as stream:
      for event in stream:
        if event.type == "content_block_start":
          blocks[event.index] = init_block(event)
        elif event.type == "content_block_delta":
          apply_delta(blocks[event.index], event.delta)
        elif event.type == "message_stop":
          stop_seen = True
    assistant_content = [b for b in assemble(blocks) if b["type"] != "thinking"]
    messages.append({"role": "assistant", "content": assistant_content})
    response = finalize(blocks)
    if response.stop_reason == "end_turn":
      return response
    for block in response.content:
      if block.type == "tool_use":
        result = execute_tool(block.name, block.input)
        messages.append({"role":"user","content":[{"type":"tool_result",
                         "tool_use_id":block.id,"content":result}]})

# --- MEMORY ---
def build_session_history(prior_sessions):
  # Concatenating all prior session transcripts in-context
  full_history = []
  for session in prior_sessions:
    full_history.extend(session["messages"])
  return full_history
```

### Model answer: Stage 2 · self-assess

Bug 1 fix: Schema layer: Replace the description with one that states intent and an exclusion:
"Use this to retrieve full account and contact details for a customer by customer ID. Do not use this for order history or transaction records."

Bug 2 fix: Streaming layer: Keep all blocks including the thinking block. Gate the commit on stop_seen and raise on interruption:

```python
assistant_content = assemble(blocks)	# keep all blocks including thinking
if stop_seen:
	messages.append({"role": "assistant", "content": assistant_content})
else:
	raise StreamInterruptedError(
    	"Discarding partial turn; retry from last complete turn."
	)
```

Bug 3 fix: Context layer: Bug 3 is resolved once Bug 2 is fixed. The full assistant turn, including the tool_use block, is now appended before the tool_result, satisfying the pairing rule.

Bug 4 fix: Memory layer: Use external storage and inject only a summary at session start rather than concatenating full transcripts:

```python
def build_session_history(prior_sessions):
	if not prior_sessions:
    	return []
	summary = load_session_summary(prior_sessions[-1]["id"])   # from external store
	return [{"role": "user", "content": f"Session context: {summary}"}]
```
