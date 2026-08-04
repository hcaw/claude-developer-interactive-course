"use client";

import { useTransition, useState } from "react";

import {
  demoteAction,
  promoteAction,
  restoreAction,
  revokeAction,
  type ActionResult,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { StatusPill } from "@/components/ui/status-pill";
import { TableHead, TableShell, Td, Th, Tr } from "@/components/ui/table";

export type Person = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  revoked: boolean;
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
        <Callout variant="error" className="p-3">
          {error}
        </Callout>
      )}

      <TableShell>
        <TableHead>
          <tr>
            <Th>Person</Th>
            <Th>Access</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </TableHead>
        <tbody>
          {people.map((p) => (
            <Tr key={p.id}>
              <Td>
                <div className="text-foreground">
                  {p.name ?? p.email}
                  {p.isSelf && <span className="ml-2 text-xs text-muted-foreground">you</span>}
                </div>
                {p.name && <div className="text-xs text-muted-foreground">{p.email}</div>}
              </Td>
              <Td>
                {p.revoked ? (
                  <StatusPill tone="danger">revoked</StatusPill>
                ) : p.isAdmin ? (
                  <StatusPill tone="active">admin</StatusPill>
                ) : (
                  <StatusPill tone="muted">member</StatusPill>
                )}
              </Td>
              <Td>
                <div className="flex justify-end gap-2">
                  {p.revoked ? (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={pending}
                      onClick={() => run(restoreAction, p.id)}
                    >
                      Restore
                    </Button>
                  ) : (
                    <>
                      {p.isAdmin ? (
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={pending}
                          onClick={() => run(demoteAction, p.id)}
                        >
                          Remove admin
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={pending}
                          onClick={() => run(promoteAction, p.id)}
                        >
                          Make admin
                        </Button>
                      )}
                      {!p.isSelf && (
                        <Button
                          variant="destructive"
                          size="xs"
                          disabled={pending}
                          onClick={() => run(revokeAction, p.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
