// A module's lessons, listed under the headings they were authored in.
//
// Those headings used to be "sections" — their own pages, their own unit of completion. They are
// now only a way to group the list (adr/2026-08-04-11): not links, not progress.

import Link from "next/link";
import { notFound } from "next/navigation";

import { ListCard } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { getModule, getModuleGroups, getModuleLessons } from "@/content/manifest";
import { deriveForUser } from "@/lib/activity";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Next 16: route params arrive as a Promise and must be awaited.
type Props = { params: Promise<{ module: string }> };

export default async function ModulePage({ params }: Props) {
  const { module: moduleParam } = await params;
  const moduleNumber = Number(moduleParam);
  const mod = Number.isInteger(moduleNumber) ? getModule(moduleNumber) : undefined;
  if (!mod) notFound();

  const user = await requireUser();
  const derived = await deriveForUser(user.id);
  const lessons = getModuleLessons(moduleNumber);
  const groups = getModuleGroups(moduleNumber);
  const moduleProgress = derived.modules.get(moduleNumber);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          ← All modules
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">{mod.title}</h1>
        <p className="mt-2 text-muted-foreground">
          Module {mod.module} · {moduleProgress?.completeLessonKeys.length ?? 0} of {lessons.length}{" "}
          lessons complete
        </p>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="mono-label mb-2">{group.title}</h2>
            <ListCard>
              {group.lessons.map((l) => {
                const p = derived.lessons.get(l.key);
                const state = p?.complete ? "complete" : (p?.fraction ?? 0) > 0 ? "partial" : "none";
                return (
                  <li key={l.key}>
                    <Link
                      href={`/lessons/${l.slug}`}
                      className="block px-4 py-3 transition-colors hover:bg-secondary"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex min-w-0 items-center gap-3">
                          <StatusDot state={state} />
                          <span className="truncate text-foreground">{l.title}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {l.type}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ListCard>
          </section>
        ))}
      </div>
    </div>
  );
}
