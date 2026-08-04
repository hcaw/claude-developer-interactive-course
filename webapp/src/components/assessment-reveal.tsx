"use client";

import { useState } from "react";

import { Blocks } from "./block-renderer";
import type { Block } from "@/content/types";

type Props = {
  articleKey: string;
  /** Model answer already revealed in a previous session. */
  initialBlocks?: Block[] | null;
};

export function AssessmentReveal({ articleKey, initialBlocks = null }: Props) {
  const [blocks, setBlocks] = useState<Block[] | null>(initialBlocks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/assessment/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleKey }),
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

  if (blocks) {
    return (
      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <p className="mb-3 text-sm font-medium text-slate-400">Model answer</p>
        <Blocks blocks={blocks} />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={reveal}
        disabled={loading}
        className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500 disabled:opacity-40"
      >
        {loading ? "Loading…" : "Show model answer"}
      </button>
      <p className="mt-2 text-sm text-slate-500">
        Have a go first — revealing marks this exercise reviewed.
      </p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
