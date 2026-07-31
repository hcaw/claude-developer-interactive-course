---
module: 2
module_title: "Production-Grade Prompting, Agents & Tool Use"
section: 9
section_title: "Cumulative Debug Task"
article: 1
article_type: "Cumulative"
title: "Cumulative debug task · Identify each bug"
duration: "8 min"
screen_id: "S22"
---

# Cumulative debug task · Identify each bug

The agent implementation below has four planted bugs, one in each of four layers: the schema layer, the streaming layer where the response is assembled and committed, the context layer where the message structure is built, and the memory layer.

Work through the two stages below. This screen covers Stage 1: identify each bug. Stage 2, writing the corrected version, is on the next screen.

**Buggy implementation**

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

## Stage 1: Identify each bug

The implementation above has four bugs, one in each of four layers. For each bug: name the layer it belongs to and write one sentence describing what it causes at runtime.

### Model answer: Stage 1 · self-assess

Bug 1 (vague description "Gets data."): Schema layer: Claude cannot distinguish this tool from any other retrieval tool and selects on surface-level matching rather than intent.

Bug 2 (turn committed before message_stop; thinking block stripped): Streaming layer: An interrupted stream writes a partial, possibly half-built tool_use, block into history; the stripped thinking block breaks the carry-back rule and the API rejects the next request because the signature no longer matches.

Bug 3 (only tool_result appended; no preceding assistant tool_use turn): Context layer: The API sees a tool_result referencing a tool_use block it never received as a complete assistant turn and rejects the request.

Bug 4 (all prior session transcripts concatenated in-context): Memory layer: The context window grows with every session and fills before the agent can process the current request by session four or five.
