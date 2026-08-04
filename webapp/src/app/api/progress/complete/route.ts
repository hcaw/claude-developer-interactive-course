// "Mark complete" for sections that have no requirements at all.
//
// Only two sections qualify (m3-09-module-complete, m4-09-module-complete): no video, no
// assessment, nothing to observe. Without this they could never complete, and their modules could
// never complete either.
//
// The manifest's zeroRequirementSections list is the whitelist — this route must not become a
// general "mark anything done" endpoint, or video and quiz requirements become bypassable.

import { NextResponse } from "next/server";

import { getSection, zeroRequirementSections } from "@/content/manifest";
import { db } from "@/db";
import { manualCompletions } from "@/db/schema";
import { deriveAndRecord } from "@/lib/activity";
import { requireApiUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { itemKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const itemKey = typeof body.itemKey === "string" ? body.itemKey : null;
  if (!itemKey || !zeroRequirementSections.has(itemKey)) {
    return NextResponse.json(
      { error: "itemKey is not a zero-requirement section" },
      { status: 400 }
    );
  }

  await db
    .insert(manualCompletions)
    .values({ userId: user.id, itemKey })
    .onConflictDoNothing();

  const derived = await deriveAndRecord(user.id);
  const section = getSection(itemKey);

  return NextResponse.json({
    ok: true,
    sectionComplete: derived.sections.get(itemKey)?.complete ?? false,
    moduleComplete: section ? (derived.modules.get(section.module)?.complete ?? false) : false,
  });
}
