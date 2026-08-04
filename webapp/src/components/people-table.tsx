"use client";

import { useTransition, useState } from "react";

import {
  demoteAction,
  promoteAction,
  restoreAction,
  revokeAction,
  type ActionResult,
} from "@/app/admin/actions";

export type Person = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  revoked: boolean;
  /** True when their admin rights come from BOOTSTRAP_ADMIN_EMAILS and can't be edited here. */
  bootstrapAdmin: boolean;
  isSelf: boolean;
};

export function PeopleTable({ people }: { people: Person[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: (id: string) => Promise<ActionResult>, id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await fn(id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-900">
              <th className="px-4 py-3 font-semibold text-slate-100">Person</th>
              <th className="px-4 py-3 font-semibold text-slate-100">Access</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-slate-800">
                <td className="px-4 py-3">
                  <div className="text-slate-100">
                    {p.name ?? p.email}
                    {p.isSelf && <span className="ml-2 text-xs text-slate-500">you</span>}
                  </div>
                  {p.name && <div className="text-xs text-slate-500">{p.email}</div>}
                </td>
                <td className="px-4 py-3">
                  {p.revoked ? (
                    <span className="text-red-400">revoked</span>
                  ) : p.isAdmin || p.bootstrapAdmin ? (
                    <span className="text-emerald-400">
                      admin
                      {p.bootstrapAdmin && (
                        <span className="ml-2 text-xs text-slate-500">via env</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">member</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {p.revoked ? (
                      <Button disabled={pending} onClick={() => run(restoreAction, p.id)}>
                        Restore
                      </Button>
                    ) : (
                      <>
                        {p.bootstrapAdmin ? (
                          // Editing this row would do nothing — env wins on every request.
                          <span className="text-xs text-slate-600">managed in env</span>
                        ) : p.isAdmin ? (
                          <Button disabled={pending} onClick={() => run(demoteAction, p.id)}>
                            Remove admin
                          </Button>
                        ) : (
                          <Button disabled={pending} onClick={() => run(promoteAction, p.id)}>
                            Make admin
                          </Button>
                        )}
                        {!p.isSelf && (
                          <Button
                            danger
                            disabled={pending}
                            onClick={() => run(revokeAction, p.id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-2.5 py-1 text-xs disabled:opacity-40 ${
        danger
          ? "border-red-900 text-red-300 hover:border-red-700"
          : "border-slate-700 text-slate-300 hover:border-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
