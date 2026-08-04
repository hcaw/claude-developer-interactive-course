import Link from "next/link";
import { notFound } from "next/navigation";

import { getModule, getModuleSections } from "@/content/manifest";
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
  const sections = getModuleSections(moduleNumber);
  const moduleProgress = derived.modules.get(moduleNumber);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← All modules
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-slate-100">{mod.title}</h1>
        <p className="mt-2 text-slate-400">
          Module {mod.module} · {moduleProgress?.completeSectionIds.length ?? 0} of{" "}
          {sections.length} sections complete
        </p>
      </div>

      <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
        {sections.map((s) => {
          const p = derived.sections.get(s.id);
          return (
            <li key={s.id}>
              <Link href={`/sections/${s.id}`} className="block px-4 py-4 hover:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className={`size-1.5 shrink-0 rounded-full ${
                        p?.complete
                          ? "bg-emerald-500"
                          : (p?.fraction ?? 0) > 0
                            ? "bg-amber-500"
                            : "bg-slate-700"
                      }`}
                    />
                    <span className="truncate font-medium text-slate-100">
                      <span className="mr-3 text-slate-500 tabular-nums">
                        {String(s.section).padStart(2, "0")}
                      </span>
                      {s.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {s.articles.length} article{s.articles.length === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
