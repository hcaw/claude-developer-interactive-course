// Admin: a users × modules completion matrix.
//
// Runs the same deriveProgress() the learner UI runs. Nothing here recomputes completion in SQL.

import { PeopleTable, type Person } from "@/components/people-table";
import { manifest } from "@/content/manifest";
import { isBootstrapAdmin, listPeople } from "@/lib/access";
import { loadAllUsersProgress } from "@/lib/activity";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [rows, people] = await Promise.all([loadAllUsersProgress(), listPeople()]);

  const totalSections = manifest.sections.length;
  const peopleRows: Person[] = people.map((p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    isAdmin: p.isAdmin,
    revoked: p.revokedAt !== null,
    bootstrapAdmin: isBootstrapAdmin(p.email),
    isSelf: p.id === admin.id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100">Progress</h1>
        <p className="mt-2 text-slate-400">
          {rows.length} user{rows.length === 1 ? "" : "s"} · {manifest.modules.length} modules ·{" "}
          {totalSections} sections
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 p-6 text-slate-500">
          Nobody has signed in yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-900">
                <th className="px-4 py-3 font-semibold text-slate-100">User</th>
                {manifest.modules.map((m) => (
                  <th key={m.module} className="px-4 py-3 text-center font-semibold text-slate-100">
                    M{m.module}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-slate-100">Sections</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user, derived }) => {
                const done = [...derived.sections.values()].filter((s) => s.complete).length;
                return (
                  <tr key={user.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">
                      <div className="text-slate-100">{user.name ?? user.email}</div>
                      {user.name && <div className="text-xs text-slate-500">{user.email}</div>}
                    </td>
                    {manifest.modules.map((m) => {
                      const mod = derived.modules.get(m.module);
                      const complete = mod?.complete ?? false;
                      const partial = mod?.completeSectionIds.length ?? 0;
                      return (
                        <td key={m.module} className="px-4 py-3 text-center">
                          {complete ? (
                            <span className="text-emerald-400">✓</span>
                          ) : partial > 0 ? (
                            <span className="text-amber-400 tabular-nums">
                              {partial}/{mod?.sectionIds.length}
                            </span>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                      {done}/{totalSections}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="pt-4">
        <h2 className="text-2xl font-semibold text-slate-100">People</h2>
        <p className="mt-2 mb-4 text-slate-400">
          Anyone with an allowed email domain can sign in; their row appears here on first sign-in.
          Revoking keeps their progress — it can be restored.
        </p>
        {peopleRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-6 text-slate-500">
            Nobody has signed in yet.
          </p>
        ) : (
          <PeopleTable people={peopleRows} />
        )}
      </section>
    </div>
  );
}
