// Reveal the model answer for a free-form assessment.
//
// One click returns the content AND grants credit. That is a deliberate casual-gating tradeoff for
// a trusted internal team (docs/wiki/webapp-architecture.md): the 29 free-form exercises can't be
// auto-graded, so "I looked at the model answer" is the only completion signal available.

import { NextResponse } from "next/server";

import { getAnswerKey } from "@/content/answer-key";
import { freeformArticleKeys, getArticle } from "@/content/manifest";
import { db } from "@/db";
import { manualCompletions } from "@/db/schema";
import { deriveAndRecord } from "@/lib/activity";
import { requireApiUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { articleKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const articleKey = typeof body.articleKey === "string" ? body.articleKey : null;
  if (!articleKey || !freeformArticleKeys.has(articleKey)) {
    return NextResponse.json({ error: "unknown or non-freeform articleKey" }, { status: 400 });
  }

  await db
    .insert(manualCompletions)
    .values({ userId: user.id, itemKey: articleKey })
    // Re-revealing is not a new completion; keep the original timestamp.
    .onConflictDoNothing();

  const derived = await deriveAndRecord(user.id);
  const entry = getAnswerKey(articleKey);
  const section = getArticle(articleKey)?.section;

  return NextResponse.json({
    modelAnswer: entry?.kind === "freeform" ? entry.modelAnswer : [],
    sectionComplete: section ? (derived.sections.get(section.id)?.complete ?? false) : false,
    moduleComplete: section ? (derived.modules.get(section.module)?.complete ?? false) : false,
  });
}
