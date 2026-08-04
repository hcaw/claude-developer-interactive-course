// Dashboard: the five modules, their sections, and how far this user has got.

import Link from "next/link";

import { manifest, getModuleSections } from "@/content/manifest";
import { deriveForUser } from "@/lib/activity";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const derived = await deriveForUser(user.id);

  const doneSections = [...derived.sections.values()].filter((s) => s.complete).length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100">Claude Developer Course</h1>
        <p className="mt-2 text-slate-400">
          {doneSections} of {manifest.sections.length} sections complete
        </p>
      </div>

      <div className="space-y-8">
        {manifest.modules.map((m) => {
          const sections = getModuleSections(m.module);
          const mod = derived.modules.get(m.module);
          return (
            <section key={m.module}>
              <div className="mb-3 flex items-baseline gap-3">
                <span className="text-sm font-medium text-slate-500">Module {m.module}</span>
                <Link
                  href={`/modules/${m.module}`}
                  className="text-xl font-semibold text-slate-100 hover:text-white"
                >
                  {m.title}
                </Link>
                <span className="ml-auto shrink-0 text-sm tabular-nums text-slate-500">
                  {mod?.complete ? (
                    <span className="text-emerald-400">complete</span>
                  ) : (
                    `${mod?.completeSectionIds.length ?? 0}/${sections.length}`
                  )}
                </span>
              </div>
              <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
                {sections.map((s) => {
                  const p = derived.sections.get(s.id);
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/sections/${s.id}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-900"
                      >
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
                          <span className="truncate text-slate-200">
                            <span className="mr-3 text-slate-500 tabular-nums">
                              {String(s.section).padStart(2, "0")}
                            </span>
                            {s.title}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {s.video ? "video" : s.debriefVideo ? "debrief" : "reading"} ·{" "}
                          {s.articles.length} article{s.articles.length === 1 ? "" : "s"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
