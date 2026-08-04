// Reveal the model answer for a free-form assessment.
//
// One click returns the content AND grants credit. That is a deliberate casual-gating tradeoff for
// a trusted internal team (docs/wiki/webapp-architecture.md): the 29 free-form exercises can't be
// auto-graded, so "I looked at the model answer" is the only completion signal available.

import { NextResponse } from "next/server";

import { getAnswerKey } from "@/content/answer-key";
import { freeformLessonKeys, getLessonByKey } from "@/content/manifest";
import { db } from "@/db";
import { manualCompletions } from "@/db/schema";
import { deriveAndRecord } from "@/lib/activity";
import { requireApiUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { lessonKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const lessonKey = typeof body.lessonKey === "string" ? body.lessonKey : null;
  if (!lessonKey || !freeformLessonKeys.has(lessonKey)) {
    return NextResponse.json({ error: "unknown or non-freeform lessonKey" }, { status: 400 });
  }

  await db
    .insert(manualCompletions)
    .values({ userId: user.id, itemKey: lessonKey })
    // Re-revealing is not a new completion; keep the original timestamp.
    .onConflictDoNothing();

  const derived = await deriveAndRecord(user.id);
  const entry = getAnswerKey(lessonKey);
  const lesson = getLessonByKey(lessonKey);

  return NextResponse.json({
    modelAnswer: entry?.kind === "freeform" ? entry.modelAnswer : [],
    lessonComplete: derived.lessons.get(lessonKey)?.complete ?? false,
    moduleComplete: lesson ? (derived.modules.get(lesson.module)?.complete ?? false) : false,
  });
}
