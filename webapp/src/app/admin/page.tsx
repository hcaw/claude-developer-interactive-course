// Admin: a users × modules completion matrix, plus the people/access table.
//
// Runs the same deriveProgress() the learner UI runs. Nothing here recomputes completion in SQL.

import type { Metadata } from "next";

import { PeopleTable, type Person } from "@/components/people-table";
import { Callout } from "@/components/ui/callout";
import { TableHead, TableShell, Td, Th, Tr } from "@/components/ui/table";
import { manifest } from "@/content/manifest";
import { listPeople } from "@/lib/access";
import { loadAllUsersProgress } from "@/lib/activity";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Claude Developer Course" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [rows, people] = await Promise.all([loadAllUsersProgress(), listPeople()]);

  const totalLessons = manifest.lessons.length;
  const peopleRows: Person[] = people.map((p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    isAdmin: p.isAdmin,
    revoked: p.revokedAt !== null,
    isSelf: p.id === admin.id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Admin</h1>
        <p className="mt-2 text-muted-foreground">
          {rows.length} user{rows.length === 1 ? "" : "s"} · {manifest.modules.length} modules ·{" "}
          {totalLessons} lessons
        </p>
      </div>

      <h2 className="text-2xl font-semibold text-foreground">Progress</h2>

      {rows.length === 0 ? (
        <Callout variant="empty" className="p-6">
          Nobody has signed in yet.
        </Callout>
      ) : (
        <TableShell>
          <TableHead>
            <tr>
              <Th>User</Th>
              {manifest.modules.map((m) => (
                <Th key={m.module} className="text-center">
                  M{m.module}
                </Th>
              ))}
              <Th className="text-right">Lessons</Th>
            </tr>
          </TableHead>
          <tbody>
            {rows.map(({ user, derived }) => {
              const done = [...derived.lessons.values()].filter((l) => l.complete).length;
              return (
                <Tr key={user.id}>
                  <Td>
                    <div className="text-foreground">{user.name ?? user.email}</div>
                    {user.name && (
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    )}
                  </Td>
                  {manifest.modules.map((m) => {
                    const mod = derived.modules.get(m.module);
                    const complete = mod?.complete ?? false;
                    const partial = mod?.completeLessonKeys.length ?? 0;
                    return (
                      <Td key={m.module} className="text-center">
                        {complete ? (
                          <span className="text-accent-text">
                            ✓<span className="sr-only"> complete</span>
                          </span>
                        ) : partial > 0 ? (
                          <span className="font-mono tabular-nums text-ink-2">
                            {partial}/{mod?.lessonKeys.length}
                          </span>
                        ) : (
                          <span className="text-ink-4">
                            —<span className="sr-only"> not started</span>
                          </span>
                        )}
                      </Td>
                    );
                  })}
                  <Td className="text-right font-mono tabular-nums text-ink-2">
                    {done}/{totalLessons}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      <section className="pt-4">
        <h2 className="text-2xl font-semibold text-foreground">People</h2>
        <p className="mt-2 mb-4 text-muted-foreground">
          Anyone with an allowed email domain can sign in; their row appears here on first sign-in.
          Revoking keeps their progress — it can be restored.
        </p>
        {peopleRows.length === 0 ? (
          <Callout variant="empty" className="p-6">
            Nobody has signed in yet.
          </Callout>
        ) : (
          <PeopleTable people={peopleRows} />
        )}
      </section>
    </div>
  );
}
