---
module: 5
module_title: "Accelerators & IP Contribution"
section: 6
section_title: "Comparing Platforms"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 6: Diagnose the platform mismatch from a comparison trace"
duration: "3 min"
screen_id: "S13"
---

# Checkpoint 6: Diagnose the platform mismatch from a comparison trace

Try it now. The comparison trace below shows a deployment platform selected on familiarity failing a customer requirement. Identify the mechanism, then pick the targeted fix from the three options.

**The trace**

```text
platform_selected = "team_default"   # chosen on familiarity
latency_test: measured from dev laptop -> 180ms (looked fine)
customer_region: eu-west, payload 12 KB
compliance_check: data residency = EU-only required
result: REJECTED  reason="data processed outside EU on selected platform"
```

- **A.** Option 1: Optimize the parser to cut the 180ms latency measured on the laptop.
- **B.** Option 2: Remeasure latency from EU-west and select the platform whose region satisfies EU-only residency.
- **C.** Option 3: Add a caching layer to reduce per call cost on the selected platform.

**Answer: B**

### Why

The mechanism is a residency mismatch. The latency number hides it because it was measured from the wrong place. The fix is to measure latency from the customer's region and choose the platform that meets EU-only residency, which is the dimension that determines this placement.

- **A.** The rejection reason names data residency, not speed. Optimizing latency treats a dimension that was never the problem.
- **C.** The rejection reason names data residency, not cost. Adding caching treats a dimension that was never the problem.

### Other feedback branches

- **Partial:** You saw that the laptop latency measurement was misleading, which is true, but the fix doesn't consist merely of re-measuring. The rejection was based on residency, so the platform itself must change to one that processes data in the required region.
- **Incorrect:** The rejection reason names data residency, as opposed to speed or cost. Optimizing latency or adding caching treats dimensions that were never the problem. The compliance dimension failed, so the fix is to change the platform to one that satisfies residency.
