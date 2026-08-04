// SERVER ONLY. Correct answers, explanations, and model answers.
//
// The `server-only` import below is the enforcement: if any client component (directly or through
// an import chain) pulls this module in, the build fails rather than silently shipping the answers
// to the browser. Only grading/reveal route handlers may import it.
//
// Invariant: adr/2026-08-01-04-course-content-static-at-build.md

import "server-only";

import raw from "./answer-key.json";
import type { AnswerKey, AnswerKeyEntry } from "./types";

const answerKey = raw as unknown as AnswerKey;

export function getAnswerKey(articleKey: string): AnswerKeyEntry | undefined {
  return answerKey[articleKey];
}

/**
 * Grade positional answers against the key.
 * `submitted[i]` is the letter chosen for question i; a missing/blank entry counts as wrong.
 */
export function gradeQuiz(
  articleKey: string,
  submitted: string[]
): { score: number; total: number; results: { correct: boolean; expected: string; explanation: string }[] } | null {
  const entry = getAnswerKey(articleKey);
  if (!entry || entry.kind !== "quiz") return null;

  const results = entry.answers.map((a, i) => {
    const correct = (submitted[i] ?? "").toUpperCase() === a.letter.toUpperCase();
    return { correct, expected: a.letter, explanation: a.explanation };
  });

  return {
    score: results.filter((r) => r.correct).length,
    total: entry.answers.length,
    results,
  };
}
