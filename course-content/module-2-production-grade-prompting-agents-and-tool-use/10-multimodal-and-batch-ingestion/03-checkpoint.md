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

Read the three input scenarios below. For each input scenario, select the correct encoding method.

### Scenario 1 · A reference product diagram used in every request your pipeline makes

- **A.** Message Batches API: submit all requests in one batch call, poll for completion
- **B.** Files API: upload once, reference file_id in each request
- **C.** Inline base64: encode and include directly in the message block

**Answer: B** — Inline base64 would resend the full payload with every request, adding transfer overhead and latency on every call.

### Scenario 2 · A one-off screenshot of a UI bug, submitted by a support engineer in a single request

- **A.** Message Batches API: submit all requests in one batch call, poll for completion
- **B.** Files API: upload once, reference file_id in each request
- **C.** Inline base64: encode and include directly in the message block

**Answer: C** — Uploading to the Files API adds a round-trip step for an asset that will only ever be used once.

### Scenario 3 · A job classifying 5,000 customer feedback responses

- **A.** Message Batches API: submit all requests in one batch call, poll for completion
- **B.** Files API: upload once, reference file_id in each request
- **C.** Inline base64: encode and include directly in the message block

**Answer: A** — The synchronous API would process requests sequentially or require managing thousands of concurrent connections against rate limits.

### Why

Match the encoding to the asset's lifetime and volume: reused assets go to the Files API once, one-off inputs travel inline, and bulk offline jobs belong on the Batches API.
