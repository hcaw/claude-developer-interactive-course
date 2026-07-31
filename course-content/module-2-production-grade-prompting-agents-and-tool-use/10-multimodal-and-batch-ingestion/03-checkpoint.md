---
module: 2
module_title: "Production-Grade Prompting, Agents & Tool Use"
section: 10
section_title: "Multimodal and Batch Ingestion"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 8 · Select the right input encoding for each scenario"
duration: "3 min"
screen_id: "S26"
---

# Checkpoint 8 · Select the right input encoding for each scenario

Read the three input scenarios below. For each input scenario, select the correct encoding method. Each item's feedback names the cost of the wrong choice.

### Options

- Message Batches API: submit all requests in one batch call, poll for completion
- Files API: upload once, reference file_id in each request
- Inline base64: encode and include directly in the message block

### Answer key

**A reference product diagram used in every request your pipeline makes**  
Files API: upload once, reference file_id in each request

**A one-off screenshot of a UI bug, submitted by a support engineer in a single request**  
Inline base64: encode and include directly in the message block

**A job classifying 5,000 customer feedback responses**  
Message Batches API: submit all requests in one batch call, poll for completion

### Why

**Correct method:** Files API: upload once, reference file_id in each request Inline base64 would resend the full payload with every request, adding transfer overhead and latency on every call.

**Correct method:** Inline base64: encode and include directly in the message block Files uploaded to API add a round-trip step for an asset that will only ever be used once.

**Correct method:** Message Batches API: submit all requests in one batch call, poll for completion Synchronous API would process requests sequentially or require managing thousands of concurrent connections against rate limits.

All three scenarios matched to the right encoding method.
