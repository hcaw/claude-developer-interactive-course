// Video progress heartbeat. Called every ~10s while playing, plus a sendBeacon flush on
// pause/ended/pagehide.
//
// The upsert is deliberately done in one statement: `max_position_seconds` must move only forward
// and `completed_at` must be set exactly once, and doing that as read-then-write would let two
// in-flight heartbeats clobber each other. GREATEST and the CASE below make the write idempotent
// and order-independent, so a late beacon carrying a stale position can't rewind the high-water
// mark.

import { NextResponse } from "next/server";

import { validVideoIds } from "@/content/manifest";
import { db } from "@/db";
import { deriveAndRecord } from "@/lib/activity";
import { requireApiUser } from "@/lib/session";
import { upsertVideoProgress } from "@/lib/video-progress";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { videoId?: unknown; position?: unknown; duration?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const videoId = typeof body.videoId === "string" ? body.videoId : null;
  // Content ids are validated against the manifest, never trusted from the client — the DB has no
  // foreign key to content to catch this for us (adr/2026-08-01-06).
  if (!videoId || !validVideoIds.has(videoId)) {
    return NextResponse.json({ error: "unknown videoId" }, { status: 400 });
  }

  const position = Number(body.position);
  const duration = Number(body.duration);
  if (!Number.isFinite(position) || position < 0) {
    return NextResponse.json({ error: "invalid position" }, { status: 400 });
  }
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : null;
  // Clamp: a client reporting a position past the end shouldn't be able to fake completion.
  const safePosition = safeDuration ? Math.min(position, safeDuration) : position;

  await upsertVideoProgress(db, {
    userId: user.id,
    videoId,
    position: safePosition,
    duration: safeDuration,
  });

  const derived = await deriveAndRecord(user.id);
  // At most one lesson can require a given video: the generator assigns each video to exactly one
  // owning lesson, and only the owner's copy is `required`.
  const lesson = [...derived.lessons.values()].find((l) => l.requirements.videoId === videoId);

  return NextResponse.json({
    ok: true,
    lessonComplete: lesson?.complete ?? false,
    moduleComplete: lesson ? (derived.modules.get(lesson.module)?.complete ?? false) : false,
  });
}
