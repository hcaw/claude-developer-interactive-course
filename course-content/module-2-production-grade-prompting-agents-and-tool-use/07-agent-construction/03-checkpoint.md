---
module: 2
module_title: "Production-Grade Prompting, Agents & Tool Use"
section: 7
section_title: "Agent Construction"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 6 · Complete the agent wiring"
duration: "4 min"
screen_id: "S18"
---

# Checkpoint 6 · Complete the agent wiring

The partial agent implementation below has two gaps. Write the missing content for each gap: (1) the description for update_record, and (2) the HITL checkpoint code.

**Partial implementation**

```python
tools = [
  {
    "name": "read_record",
    "description": "Use this to read a customer record by customer_id.",
    "input_schema": {
      "type": "object",
      "properties": {
        "customer_id": {"type": "string"}
      },
      "required": ["customer_id"]
    }
  },
  {
    "name": "update_record",
    "description": [BLANK, write the description for this tool],
    "input_schema": {
      "type": "object",
      "properties": {
        "customer_id": {"type": "string"},
        "field": {"type": "string"},
        "new_value": {"type": "string"}
      },
      "required": ["customer_id", "field", "new_value"]
    }
  }
]

def run_agent_loop(user_request):
    messages = [{"role": "user", "content": user_request}]

    while True:
        response = client.messages.create(
            model=model, max_tokens=4096,
            tools=tools,
            messages=messages
        )

        if response.stop_reason == "end_turn":
            return response

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for block in response.content:
                if block.type == "tool_use":

                    [BLANK, insert HITL checkpoint before executing update_record]

                    result = execute_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })

            messages.append({"role": "user", "content": tool_results})
```

### Gap 1: Write the description for update_record

### Gap 2: Write the HITL checkpoint code

### Model answers · self-assess

**Gap 1: description for update_record**

```text
"Use this to update a specific field on a customer record. Only call this tool after a read_record call has confirmed the current value and the proposed change has been reviewed. Do not use this for bulk updates or schema changes."
```

The restrictive description tells the agent when not to call the tool, what must be true before it is called, and what it should never be used for, in language the model can route on. A bare description would let the agent call update_record whenever it inferred an update was needed, including before reading the current value or on fields the operator did not intend to change.

**Gap 2: HITL checkpoint code**

```python
                if block.type == "tool_use":
                    if block.name == "update_record":
                        print(f"Proposed update, customer_id: {block.input['customer_id']}, "
                              f"field: {block.input['field']}, new_value: {block.input['new_value']}")
                        approval = input("Approve this update? (yes/no): ").strip().lower()
                        if approval != "yes":
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": "Update rejected by operator."
                            })
                            continue
                    result = execute_tool(block.name, block.input)
```

The checkpoint sits inside the loop and gates on the tool name, so read_record calls pass through unchanged and update_record calls pause for explicit approval. A single up-front approval cannot gate a specific update the model has not yet proposed. Approving after execute_tool has run means the irreversible work is already done.
