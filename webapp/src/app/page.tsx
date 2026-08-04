// Dashboard: the five modules and how far this user has got.
//
// One row per module rather than per lesson — 108 lessons would bury the shape of the course. The
// module page is where the lesson list lives.

import Link from "next/link";

import { ListCard } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { manifest, getModuleLessons } from "@/content/manifest";
import { deriveForUser } from "@/lib/activity";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const derived = await deriveForUser(user.id);

  const doneLessons = [...derived.lessons.values()].filter((l) => l.complete).length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Claude Developer Course</h1>
        <p className="mt-2 text-muted-foreground">
          {doneLessons} of {manifest.lessons.length} lessons complete
        </p>
      </div>

      <ListCard>
        {manifest.modules.map((m) => {
          const lessons = getModuleLessons(m.module);
          const mod = derived.modules.get(m.module);
          const done = mod?.completeLessonKeys.length ?? 0;
          const state = mod?.complete ? "complete" : done > 0 ? "partial" : "none";
          const next = lessons.find((l) => !derived.lessons.get(l.key)?.complete);

          return (
            <li key={m.module}>
              <Link
                href={`/modules/${m.module}`}
                className="block px-4 py-4 transition-colors hover:bg-secondary"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="flex min-w-0 items-baseline gap-3">
                    <StatusDot state={state} />
                    <span className="mono-label shrink-0">Module {m.module}</span>
                    <span className="truncate font-heading text-lg font-semibold tracking-tight text-foreground">
                      {m.title}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {mod?.complete ? (
                      <span className="uppercase tracking-widest text-accent-text">complete</span>
                    ) : (
                      `${done}/${lessons.length}`
                    )}
                  </span>
                </div>
                {next && (
                  <p className="mt-1 truncate pl-[1.6rem] text-sm text-muted-foreground">
                    Up next: {next.title}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ListCard>
    </div>
  );
}
