---
module: 2
module_title: "Production-Grade Prompting, Agents & Tool Use"
section: 5
section_title: "Streaming Responses"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 4 · Repair the broken stream handler"
duration: "4 min"
screen_id: "S12"
---

# Checkpoint 4 · Repair the broken stream handler

The handler below streams a response and appends the assistant turn to conversation history. It contains one defect that only surfaces when a stream is interrupted. Identify the defect and write the corrected version.

**Broken handler**

```python
blocks = {}
stop_seen = False
with client.messages.stream(model=model, max_tokens=4096, messages=messages, tools=tools) as stream:
    for event in stream:
        if event.type == "content_block_start":
            blocks[event.index] = init_block(event)
        elif event.type == "content_block_delta":
            apply_delta(blocks[event.index], event.delta)
        elif event.type == "message_stop":
            stop_seen = True
messages.append({"role": "assistant", "content": assemble(blocks)})
```

### Model answer · self-assess

```python
blocks = {}
stop_seen = False
with client.messages.stream(model=model, max_tokens=4096, messages=messages, tools=tools) as stream:
    for event in stream:
        if event.type == "content_block_start":
            blocks[event.index] = init_block(event)
        elif event.type == "content_block_delta":
            apply_delta(blocks[event.index], event.delta)
        elif event.type == "message_stop":
            stop_seen = True
if stop_seen:
    messages.append({"role": "assistant", "content": assemble(blocks)})
else:
    raise StreamInterruptedError(
        "Stream ended before message_stop; discarding partial turn. Retry from the last complete turn."
    )
```

### Why

The defect: the append runs whether or not message_stop arrived. An interrupted stream commits a partial turn, possibly including a half-built tool_use block, to history. Gating the append on stop_seen means only complete messages enter history. When the stream is interrupted, raising causes the request to be retried from the last complete turn rather than corrupting context with a malformed block.
