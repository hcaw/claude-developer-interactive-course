"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { sectionId: string; initiallyComplete?: boolean };

export function MarkComplete({ sectionId, initiallyComplete = false }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(initiallyComplete);
  const [busy, setBusy] = useState(false);

  async function mark() {
    setBusy(true);
    try {
      const res = await fetch("/api/progress/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: sectionId }),
      });
      if (res.ok) {
        setDone(true);
        // Refresh so the dashboard and module pages pick up the new completion.
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="mt-6 font-medium text-emerald-400">Marked complete</p>;
  }

  return (
    <button
      type="button"
      onClick={mark}
      disabled={busy}
      className="mt-6 rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-900 hover:bg-white disabled:opacity-40"
    >
      {busy ? "Saving…" : "Mark complete"}
    </button>
  );
}
