// Answer-slot normalization and comparison, shared by grading and validation.
//
// A submitted answer slot is a string: one letter ("B") or a comma-joined set ("C,D") for
// multi-select questions (adr/2026-08-04-12). One string per question keeps the API payload and
// the quiz_attempts.answers jsonb column exactly what they were for single-select — no schema
// change, no second code path.
//
// Kept separate from src/content/answer-key.ts on purpose: that module imports "server-only",
// which throws under the plain node:test runner, and this logic is exactly what needs unit tests.

/** Canonical form of a slot: uppercase letters, deduped, sorted, comma-joined. "d, C,c" -> "C,D". */
export function normalizeAnswerSlot(slot: string): string {
  return [...new Set(
    slot
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  )]
    .sort()
    .join(",");
}

/** Whether a submitted slot names exactly the expected letter set. */
export function slotMatches(submitted: string, expectedLetters: string[]): boolean {
  return normalizeAnswerSlot(submitted) === normalizeAnswerSlot(expectedLetters.join(","));
}

/**
 * Whether a slot is in the canonical wire format: 1–6 letters A–F, comma-separated, strictly
 * ascending (which rules out duplicates). The client always sends canonical slots; anything else
 * is junk, and rejecting it keeps garbage out of the quiz_attempts jsonb.
 */
export function isValidAnswerSlot(slot: string): boolean {
  if (!/^[A-F](,[A-F]){0,5}$/.test(slot)) return false;
  const letters = slot.split(",");
  return letters.every((l, i) => i === 0 || letters[i - 1] < l);
}
