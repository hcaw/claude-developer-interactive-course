"use client";

import { useState } from "react";

import { Blocks } from "./block-renderer";
import type { Block, QuizQuestion } from "@/content/types";

type Result = { correct: boolean; expected: string; explanation: string };
type Response = {
  score: number;
  total: number;
  required: number;
  passed: boolean;
  results: Result[];
  debrief: Block[];
};

type Props = {
  articleKey: string;
  questions: QuizQuestion[];
  /** True if a previous attempt already passed. */
  alreadyPassed?: boolean;
};

export function Quiz({ articleKey, questions, alreadyPassed = false }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => Array(questions.length).fill(""));
  const [result, setResult] = useState<Response | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = answers.every((a) => a !== "");

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleKey, answers }),
      });
      if (!res.ok) {
        setError("Could not submit. Try again.");
        return;
      }
      setResult((await res.json()) as Response);
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
        return (
          <fieldset key={qi} className="rounded-lg border border-slate-800 p-4">
            <legend className="sr-only">Question {qi + 1}</legend>
            <Blocks blocks={q.prompt} />
            <div className="mt-3 space-y-2">
              {q.options.map((o) => {
                const selected = answers[qi] === o.letter;
                // After grading, mark the right answer and the user's wrong pick.
                const isExpected = r && o.letter === r.expected;
                const isWrongPick = r && selected && !r.correct;
                return (
                  <label
                    key={o.letter}
                    className={`flex cursor-pointer gap-3 rounded-md border p-3 ${
                      isExpected
                        ? "border-emerald-700 bg-emerald-950/40"
                        : isWrongPick
                          ? "border-red-800 bg-red-950/30"
                          : selected
                            ? "border-sky-700 bg-sky-950/30"
                            : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${articleKey}-${qi}`}
                      value={o.letter}
                      checked={selected}
                      disabled={!!result}
                      onChange={() =>
                        setAnswers((prev) => prev.map((a, i) => (i === qi ? o.letter : a)))
                      }
                      className="mt-1"
                    />
                    <span className="text-slate-300">
                      <span className="mr-2 font-mono text-slate-500">{o.letter}.</span>
                      {o.text}
                    </span>
                  </label>
                );
              })}
            </div>
            {r && (
              <p className="mt-3 text-sm text-slate-400">
                <span className={r.correct ? "text-emerald-400" : "text-red-400"}>
                  {r.correct ? "Correct" : `Answer: ${r.expected}`}
                </span>{" "}
                {r.explanation}
              </p>
            )}
          </fieldset>
        );
      })}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!result ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={!allAnswered || submitting}
            onClick={submit}
            className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Checking…" : "Submit answers"}
          </button>
          {alreadyPassed && <span className="text-sm text-emerald-400">Already passed</span>}
          {!allAnswered && (
            <span className="text-sm text-slate-500">Answer every question to submit.</span>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className={`font-medium ${result.passed ? "text-emerald-400" : "text-amber-400"}`}>
            {result.score} / {result.total} — {result.passed ? "passed" : `${result.required} needed to pass`}
          </p>
          {result.debrief.length > 0 && (
            <div className="rounded-lg border border-slate-800 p-4">
              <Blocks blocks={result.debrief} />
            </div>
          )}
          <button
            type="button"
            onClick={retake}
            className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
          >
            Retake
          </button>
        </div>
      )}
    </div>
  );
}
