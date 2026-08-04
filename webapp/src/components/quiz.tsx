"use client";

// Graded assessment: single-select (radios) and multi-select (checkboxes) questions
// (adr/2026-08-04-12). One component covers every checkable pattern — matching and fill-blank
// checkpoints are authored as rows of single-selects sharing an option bank.
//
// An answer slot is one string per question: "B", or "C,D" for multi (kept sorted and deduped
// here, so the server always sees canonical sets). Grading is server-side, all-or-nothing per
// question.

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Blocks } from "./block-renderer";
import { InlineMd } from "./inline-md";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Block, QuizQuestion } from "@/content/types";

type Result = { correct: boolean; expected: string[]; explanation: string };
type Response = {
  score: number;
  total: number;
  required: number;
  passed: boolean;
  results: Result[];
  debrief: Block[];
};

type Props = {
  lessonKey: string;
  questions: QuizQuestion[];
  /**
   * Authored content that follows the last question. Held back until grading — trailing regularly
   * discusses the options, and one checkpoint's trailing table used to give the answers away.
   */
  trailing: Block[];
  /** True if a previous attempt already passed. */
  alreadyPassed?: boolean;
};

export function Quiz({ lessonKey, questions, trailing, alreadyPassed = false }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>(() => Array(questions.length).fill(""));
  const [result, setResult] = useState<Response | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = answers.every((a) => a !== "");

  function choose(qi: number, letter: string) {
    setAnswers((prev) => prev.map((a, i) => (i === qi ? letter : a)));
  }

  /** Multi slots stay canonical — sorted, deduped, comma-joined — so picking D then C is "C,D". */
  function toggle(qi: number, letter: string) {
    setAnswers((prev) =>
      prev.map((a, i) => {
        if (i !== qi) return a;
        const set = new Set(a.split(",").filter(Boolean));
        if (set.has(letter)) set.delete(letter);
        else set.add(letter);
        return [...set].sort().join(",");
      })
    );
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonKey, answers }),
      });
      if (!res.ok) {
        setError("Could not submit. Try again.");
        return;
      }
      const graded = (await res.json()) as Response;
      setResult(graded);
      // Refresh so the header pill, module page and dashboard pick up a new pass.
      if (graded.passed && !alreadyPassed) router.refresh();
    } catch {
      setError("Could not submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function retake() {
    setAnswers(Array(questions.length).fill(""));
    setResult(null);
  }

  return (
    <div className="mt-6 space-y-6">
      {questions.map((q, qi) => {
        const r = result?.results[qi];
        const chosen = new Set(answers[qi].split(",").filter(Boolean));
        return (
          <fieldset key={qi} className="border border-border p-4">
            <legend className="sr-only">Question {qi + 1}</legend>
            <Blocks blocks={q.prompt} />
            {q.multi && (
              <p className="mono-label mt-3 text-muted-foreground">Select all that apply</p>
            )}
            <div className="mt-3 space-y-2">
              {q.options.map((o) => {
                const selected = chosen.has(o.letter);
                // After grading, mark every right answer and the user's wrong picks.
                // Strict-amber state language: right = amber, wrong = destructive
                // (see the design-system ADR — the palette has no green).
                const isExpected = r && r.expected.includes(o.letter);
                const isWrongPick = r && selected && !r.expected.includes(o.letter);
                return (
                  <label
                    key={o.letter}
                    className={cn(
                      "flex cursor-pointer gap-3 border p-3 transition-colors",
                      isExpected
                        ? "border-primary bg-accent-tint"
                        : isWrongPick
                          ? "border-destructive/40 bg-destructive/10"
                          : selected
                            ? "border-line-strong bg-secondary"
                            : "border-border hover:border-line-strong",
                    )}
                  >
                    <input
                      type={q.multi ? "checkbox" : "radio"}
                      name={`${lessonKey}-${qi}`}
                      value={o.letter}
                      checked={selected}
                      disabled={!!result}
                      onChange={() => (q.multi ? toggle(qi, o.letter) : choose(qi, o.letter))}
                      className="mt-1 accent-primary"
                    />
                    <span className="text-ink-2">
                      <span className="mr-2 font-mono text-muted-foreground">{o.letter}.</span>
                      <InlineMd text={o.text} />
                    </span>
                  </label>
                );
              })}
            </div>
            {r && (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className={r.correct ? "text-accent-text" : "text-destructive"}>
                  {r.correct ? "Correct" : `Answer: ${r.expected.join(", ")}`}
                </span>{" "}
                {r.explanation}
              </p>
            )}
          </fieldset>
        );
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!result ? (
        <div className="flex items-center gap-4">
          <Button disabled={!allAnswered || submitting} onClick={submit}>
            {submitting ? "Checking…" : "Submit answers"}
          </Button>
          {alreadyPassed && (
            <span className="font-mono text-[11px] uppercase tracking-widest text-accent-text">
              Already passed
            </span>
          )}
          {!allAnswered && (
            <span className="text-sm text-muted-foreground">Answer every question to submit.</span>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p
            className={cn(
              "font-mono text-sm tabular-nums",
              result.passed ? "text-accent-text" : "text-destructive",
            )}
          >
            {result.score} / {result.total} —{" "}
            {result.passed ? "passed" : `${result.required} needed to pass`}
          </p>
          {result.debrief.length > 0 && (
            <div className="border border-border p-4">
              <Blocks blocks={result.debrief} />
            </div>
          )}
          <Button variant="outline" onClick={retake}>
            Retake
          </Button>
        </div>
      )}

      {/* Post-question commentary: after grading, or on revisit once passed. */}
      {(result || alreadyPassed) && trailing.length > 0 && (
        <div className="mt-6">
          <Blocks blocks={trailing} />
        </div>
      )}
    </div>
  );
}
