"use client";

// Records that a view-only lesson has been read (adr/2026-08-04-11).
//
// This runs from an effect rather than server-side during render on purpose. Next prefetches
// `<Link>` targets on hover, so a page that wrote on GET would mark lessons complete for links the
// learner merely passed the cursor over. An effect only runs for a page that actually mounted.
//
// The POST is idempotent (manual_completions upserts and discards duplicates), and it is skipped
// entirely when the lesson is already complete, so the common case is zero requests.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = { lessonKey: string; initiallyComplete: boolean };

export function RecordView({ lessonKey, initiallyComplete }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(initiallyComplete);
  const sent = useRef(initiallyComplete);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/progress/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonKey }),
        });
        if (!res.ok || cancelled) return;
        setDone(true);
        // Refresh so the module page and dashboard pick up the new completion.
        router.refresh();
      } catch {
        // Not worth surfacing: the next visit records it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonKey, router]);

  // role="status": the state appears after load, so announce it rather than letting it slip past.
  return (
    <p role="status" className="mono-label text-accent-text">
      {done ? "Read" : " "}
    </p>
  );
}
