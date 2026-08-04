"use client";

// Free-text checkpoint: write your answer, then compare it with the model answer
// (adr/2026-08-04-12).
//
// The draft lives in localStorage only — these are self-assessed exercises, and persisting prose
// server-side would add a write path for content nobody grades. The reveal is still what records
// completion (a manual_completions row via /api/assessment/reveal), same as before; the change is
// that the learner's own text stays on screen for the comparison instead of vanishing behind the
// model answer.

import { useCallback, useState, useSyncExternalStore } from "react";

import { Blocks } from "./block-renderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Block } from "@/content/types";

// localStorage as an external store (same idiom as ui/theme-toggle.tsx): the server snapshot is
// "", so SSR and hydration agree, and the stored draft appears right after mount. The in-memory
// fallback keeps typing working when storage is unavailable (private mode).
const listeners = new Set<() => void>();
const memoryFallback = new Map<string, string>();

function subscribeDraft(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function readDraft(key: string): string {
  try {
    return localStorage.getItem(key) ?? memoryFallback.get(key) ?? "";
  } catch {
    return memoryFallback.get(key) ?? "";
  }
}

function writeDraft(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryFallback.set(key, value);
  }
  listeners.forEach((l) => l());
}

type Props = {
  lessonKey: string;
  /** Model answer already revealed in a previous session. */
  initialBlocks?: Block[] | null;
};

export function SelfAssess({ lessonKey, initialBlocks = null }: Props) {
  const storageKey = `checkpoint-draft:${lessonKey}`;

  const draft = useSyncExternalStore(
    subscribeDraft,
    useCallback(() => readDraft(storageKey), [storageKey]),
    () => ""
  );
  const [blocks, setBlocks] = useState<Block[] | null>(initialBlocks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (value: string) => writeDraft(storageKey, value);

  async function reveal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/assessment/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonKey }),
      });
      if (!res.ok) {
        setError("Could not load the model answer. Try again.");
        return;
      }
      const data = (await res.json()) as { modelAnswer: Block[] };
      setBlocks(data.modelAnswer);
    } catch {
      setError("Could not load the model answer. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label htmlFor={`draft-${lessonKey}`} className="mono-label mb-2 block">
          Your answer
        </label>
        <Textarea
          id={`draft-${lessonKey}`}
          value={draft}
          onChange={(e) => update(e.target.value)}
          rows={Math.max(6, Math.min(24, draft.split("\n").length + 2))}
          placeholder="Work it out here — the draft stays on this device."
        />
      </div>

      {blocks ? (
        <div className="border border-border bg-muted p-4">
          <p className="mono-label mb-3">Model answer</p>
          <Blocks blocks={blocks} />
        </div>
      ) : (
        <div>
          <Button variant="outline" onClick={reveal} disabled={loading}>
            {loading ? "Loading…" : "Compare with model answer"}
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            Have a go first — revealing marks this exercise reviewed.
          </p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
