---
module: 5
module_title: "Accelerators & IP Contribution"
section: 4
section_title: "Requirements & Lifecycle"
article: 2
article_type: "Checkpoint"
title: "Checkpoint 3: extract the requirements"
duration: "2 min"
screen_id: "S07B"
---

# Checkpoint 3: extract the requirements

Try it now. A regulated EU bank wants an agent that summarizes customer call transcripts for its support team, with summaries reviewed before they are stored in the EU.

### Question 1

A regulated EU bank wants an agent that summarizes customer call transcripts for its support team. Which of the following is a valid functional requirement?

- **A.** The agent should be fast and accurate.
- **B.** The agent produces a summary that a human approves before it is stored.
- **C.** The system must be built using an approved cloud provider.
- **D.** Transcript data must not leave the EU.

**Answer: B** — B is checkable and tied to a specific business process constraint (human-in-the-loop review). A is not checkable. C and D are infrastructure requirements, not functional ones.

### Question 2

From the same scenario, which of the following is a valid infrastructure requirement?

- **A.** The agent must produce summaries quickly enough for support staff to act on them.
- **B.** The agent summarizes transcripts using a pre-approved prompt template.
- **C.** Transcript data is processed in the EU.
- **D.** A human reviews each summary before it is stored.

**Answer: C** — C is checkable and tied to a specific regulatory constraint (specific data residency requirement). A is not checkable. B is a design choice, not an infrastructure requirement. D is a functional requirement, not an infrastructure one.
