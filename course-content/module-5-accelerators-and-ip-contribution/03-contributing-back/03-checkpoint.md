---
module: 5
module_title: "Accelerators & IP Contribution"
section: 3
section_title: "Contributing Back"
article: 3
article_type: "Checkpoint"
title: "Checkpoint 2: Choose the contribution channel and the readiness fix"
duration: "3 min"
screen_id: "S07"
---

# Checkpoint 2: Choose the contribution channel and the readiness fix

Try it now. Read the three cases below. For each case, select the channel built for it, then select the one readiness item its snippet is missing.

**Case A:** A focused tool that wraps a single API into a clean function. The snippet is the function and nothing else.

**Case B:** A full customer-service application a developer wants to share whole, including its UI and deployment scripts.

**Case C:** A one-line fix to an existing Cookbook example. The snippet is the corrected line, carried in from a customer engagement.

### Channel for Case A · the focused API-wrapper tool

- **A.** The Cookbook example's own repository
- **B.** The tool's own repository
- **C.** The Cookbook, but only after the reusable pattern is stripped out as a focused example

**Answer: B** — A focused tool lives and is reviewed in its own repository.

### Channel for Case B · the full customer-service application

- **A.** The Cookbook example's own repository
- **B.** The tool's own repository
- **C.** The Cookbook, but only after the reusable pattern is stripped out as a focused example

**Answer: C** — A whole application does not fit a review built for one pattern; only the extracted pattern goes to the Cookbook.

### Channel for Case C · the one-line Cookbook fix

- **A.** The Cookbook example's own repository
- **B.** The tool's own repository
- **C.** The Cookbook, but only after the reusable pattern is stripped out as a focused example

**Answer: A** — A fix to an existing example belongs in that example’s own repository.

### Missing readiness item for Case A · the focused API-wrapper tool

- **A.** Reduction to a single focused pattern, because a whole application does not fit a review built for one pattern
- **B.** The rights check, because engagement code can carry a licensing constraint that blocks the merge before any technical review
- **C.** A test that proves the wrapper behaves

**Answer: C** — A focused tool still needs a test that proves the wrapper behaves.

### Missing readiness item for Case B · the full customer-service application

- **A.** Reduction to a single focused pattern, because a whole application does not fit a review built for one pattern
- **B.** The rights check, because engagement code can carry a licensing constraint that blocks the merge before any technical review
- **C.** A test that proves the wrapper behaves

**Answer: A** — The application must be reduced to the pattern before it fits the review.

### Missing readiness item for Case C · the one-line Cookbook fix

- **A.** Reduction to a single focused pattern, because a whole application does not fit a review built for one pattern
- **B.** The rights check, because engagement code can carry a licensing constraint that blocks the merge before any technical review
- **C.** A test that proves the wrapper behaves

**Answer: B** — Engagement code needs the licensing gate cleared before any technical review.

### Why

Case A goes to the tool’s own repository and is missing a test that proves the wrapper behaves. Case B does not belong as a whole application, so the reusable pattern inside it goes to the Cookbook as a focused example. Case C goes to the Cookbook example’s repository and is missing the rights check, because engagement code can carry a licensing constraint that blocks the merge before any technical review.

### Other feedback branches

- **Partial · n/6:** You picked the right channels but missed a readiness item. Re-check each: a focused tool still needs a test, a whole application needs to be reduced to the pattern, and engagement code needs the licensing gate cleared first.
- **Revisit:** Channel and readiness are coupled. A full application sent whole stalls regardless of code quality, and an engagement fix sent without a rights check can be merged then reverted. Match each case to the channel built for its shape, then name what a maintainer cannot verify yet.
