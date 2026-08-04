// Grade a quiz attempt.
//
// Grading happens here and only here: the answer key is a server-only module, so the client sends
// letters and gets back results. Attempts are append-only and retakes are unlimited — the best
// attempt is what counts, which the derivation handles by looking for *any* passing attempt.

import { NextResponse } from "next/server";

import { getAnswerKey, gradeQuiz } from "@/content/answer-key";
import { getLessonByKey, gradeableLessonKeys } from "@/content/manifest";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";
import { deriveAndRecord } from "@/lib/activity";
import { isPassing, passingScore } from "@/lib/progress";
import { isValidAnswerSlot } from "@/lib/quiz-grading";
import { requireApiUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { lessonKey?: unknown; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const lessonKey = typeof body.lessonKey === "string" ? body.lessonKey : null;
  if (!lessonKey || !gradeableLessonKeys.has(lessonKey)) {
    return NextResponse.json({ error: "unknown or ungradeable lessonKey" }, { status: 400 });
  }

  const lesson = getLessonByKey(lessonKey);
  if (!lesson || lesson.assessment?.kind !== "quiz") {
    return NextResponse.json({ error: "not a quiz" }, { status: 400 });
  }
  const questionCount = lesson.assessment.questions.length;

  const answers = Array.isArray(body.answers) ? body.answers.map((a) => String(a ?? "")) : null;
  if (!answers || answers.length !== questionCount) {
    return NextResponse.json(
      { error: `expected ${questionCount} answers, got ${answers?.length ?? 0}` },
      { status: 400 }
    );
  }
  // Each slot is "B" or a comma-joined set "C,D" (multi-select). Reject junk before it reaches
  // the quiz_attempts jsonb — content ids and answers are validated, never trusted.
  if (!answers.every(isValidAnswerSlot)) {
    return NextResponse.json({ error: "answers must be letter sets like 'B' or 'C,D'" }, { status: 400 });
  }

  const graded = gradeQuiz(lessonKey, answers);
  if (!graded) return NextResponse.json({ error: "no answer key" }, { status: 500 });

  const passed = isPassing(graded.score, graded.total);

  await db.insert(quizAttempts).values({
    userId: user.id,
    articleKey: lessonKey,
    answers,
    score: graded.score,
    total: graded.total,
    passed,
  });

  const derived = await deriveAndRecord(user.id);
  const entry = getAnswerKey(lessonKey);

  return NextResponse.json({
    score: graded.score,
    total: graded.total,
    required: passingScore(graded.total),
    passed,
    // Per-question feedback and the debrief blocks are released only after an attempt exists.
    results: graded.results,
    debrief: entry?.kind === "quiz" ? entry.debrief : [],
    lessonComplete: derived.lessons.get(lessonKey)?.complete ?? false,
    moduleComplete: derived.modules.get(lesson.module)?.complete ?? false,
  });
}
