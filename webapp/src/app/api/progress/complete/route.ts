// Record that a view-only lesson has been read.
//
// A lesson with no video of its own and no assessment has nothing to observe — a watch-out story,
// a glossary, a lesson whose video another page owns. Without this they could never complete, and
// their modules could never complete either. The page records it on view (adr/2026-08-04-11).
//
// The manifest's viewOnlyLessonKeys list is the whitelist — this route must not become a general
// "mark anything done" endpoint, or video and quiz requirements become bypassable.

import { NextResponse } from "next/server";

import { getLessonByKey, viewOnlyLessonKeys } from "@/content/manifest";
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
  if (!lessonKey || !viewOnlyLessonKeys.has(lessonKey)) {
    return NextResponse.json({ error: "lessonKey is not a view-only lesson" }, { status: 400 });
  }

  await db
    .insert(manualCompletions)
    .values({ userId: user.id, itemKey: lessonKey })
    // Re-reading is not a new completion; keep the original timestamp.
    .onConflictDoNothing();

  const derived = await deriveAndRecord(user.id);
  const lesson = getLessonByKey(lessonKey);

  return NextResponse.json({
    ok: true,
    lessonComplete: derived.lessons.get(lessonKey)?.complete ?? false,
    moduleComplete: lesson ? (derived.modules.get(lesson.module)?.complete ?? false) : false,
  });
}
