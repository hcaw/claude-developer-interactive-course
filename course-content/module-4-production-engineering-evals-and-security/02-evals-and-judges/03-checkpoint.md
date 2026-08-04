---
module: 4
module_title: "Production Engineering, Evals & Security"
section: 2
section_title: "Evals & Judges"
article: 3
article_type: "Checkpoint"
title: "Complete a partial eval for a summarization feature"
duration: "9 min"
screen_id: "S04"
---

# Complete a partial eval for a summarization feature

This eval has two gaps. For the dataset, identify the specific output each input case should produce. For the judge prompt, match each score band to what it means. Select the correct answer for each row below.

**dataset.json**

```json
[
  {
    "input": "Long support thread about a delayed refund, 14 messages.",
    "expected_behavior": "A 2-sentence summary naming the issue (delayed
                          refund) and the current status (escalated)."
  },
  {
    "input": "Meeting transcript where three action items are assigned.",
    "expected_behavior": ""
  },
  {
    "input": "Bug report with repro steps and one unrelated aside.",
    "expected_behavior": ""
  }
]
```

**judge_prompt.txt**

```text
You are grading a summary against its expected behavior.
Summary:           {output}
Expected behavior: {expected_behavior}

Return JSON with "strengths", "weaknesses", "reasoning", and "score".

Score scale: 1 to 3, 4 to 7, 8 to 10 (see below to complete the definitions).
```

### Row 1 · Expected output for the meeting-transcript case

- **A.** Misses required content
- **B.** A summary that lists all three action items with their owners
- **C.** Complete and faithful to the expected behavior
- **D.** A summary of the bug and its repro steps that omits the unrelated aside
- **E.** Partial: some required content present, some missing

**Answer: B** — The dataset case is a meeting transcript where three action items are assigned; the expected_behavior must name that specific output, not restate the input.

### Row 2 · Expected output for the bug-report case

- **A.** Misses required content
- **B.** A summary that lists all three action items with their owners
- **C.** Complete and faithful to the expected behavior
- **D.** A summary of the bug and its repro steps that omits the unrelated aside
- **E.** Partial: some required content present, some missing

**Answer: D** — The dataset case is a bug report with repro steps and one unrelated aside; the expected output names the bug and repro steps and excludes the aside.

### Row 3 · Judge score band 1 to 3

- **A.** Misses required content
- **B.** A summary that lists all three action items with their owners
- **C.** Complete and faithful to the expected behavior
- **D.** A summary of the bug and its repro steps that omits the unrelated aside
- **E.** Partial: some required content present, some missing

**Answer: A** — The low band anchors to missing the required content entirely.

### Row 4 · Judge score band 4 to 7

- **A.** Misses required content
- **B.** A summary that lists all three action items with their owners
- **C.** Complete and faithful to the expected behavior
- **D.** A summary of the bug and its repro steps that omits the unrelated aside
- **E.** Partial: some required content present, some missing

**Answer: E** — The middle band anchors to partial coverage.

### Row 5 · Judge score band 8 to 10

- **A.** Misses required content
- **B.** A summary that lists all three action items with their owners
- **C.** Complete and faithful to the expected behavior
- **D.** A summary of the bug and its repro steps that omits the unrelated aside
- **E.** Partial: some required content present, some missing

**Answer: C** — The top band anchors to complete, faithful coverage of the expected behavior.

### Why

You named a concrete output for each case, for example "a summary listing all three action items with their owners" and "a summary of the bug and its repro steps that omits the unrelated aside," and you gave the judge an anchored scale, such as 1 to 3 misses required content, 4 to 7 partial, 8 to 10 complete and faithful. The expected behavior and the anchored scale are what make the score comparable across runs and defensible in review.
