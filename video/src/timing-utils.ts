import type { BeatTiming, TimedWord } from "./types";

export const FPS = 30;
export const LEAD_IN_SEC = 0.6;
export const BEAT_GAP_SEC = 0.7;
export const TAIL_SEC = 1.8;

export const beatStartSec = (timing: BeatTiming[], beatIndex: number): number => {
  let t = LEAD_IN_SEC;
  for (let i = 0; i < beatIndex; i++) {
    t += timing[i].durationSec + BEAT_GAP_SEC;
  }
  return t;
};

export const totalDurationSec = (timing: BeatTiming[]): number =>
  beatStartSec(timing, timing.length) + TAIL_SEC;

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Resolve a cue phrase to the start time (sec, within the beat's audio) of the
// first word of its first occurrence. Falls back to 0 when not found so a bad
// cue degrades to "draw at beat start" rather than never drawing.
export const cueTime = (words: TimedWord[], cue: string | undefined): number => {
  if (!cue) return 0;
  const cueWords = cue.split(/\s+/).map(norm).filter(Boolean);
  if (cueWords.length === 0) return 0;
  const spoken = words
    .map((w, i) => ({ n: norm(w.w), i }))
    .filter((x) => x.n.length > 0);
  for (let i = 0; i + cueWords.length <= spoken.length; i++) {
    let ok = true;
    for (let j = 0; j < cueWords.length; j++) {
      if (spoken[i + j].n !== cueWords[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return words[spoken[i].i].s;
  }
  console.warn(`cue not found in narration: "${cue}"`);
  return 0;
};

export type CaptionChunk = { words: TimedWord[]; start: number; end: number };

// Group a beat's words into caption chunks of up to `maxWords` real words,
// breaking early at sentence punctuation. Punctuation tokens attach to the
// preceding word.
export const captionChunks = (words: TimedWord[], maxWords = 6): CaptionChunk[] => {
  const chunks: CaptionChunk[] = [];
  let cur: TimedWord[] = [];
  let count = 0;
  const flush = () => {
    if (cur.length) {
      chunks.push({ words: cur, start: cur[0].s, end: cur[cur.length - 1].e });
      cur = [];
      count = 0;
    }
  };
  for (const w of words) {
    const isPunct = norm(w.w).length === 0;
    cur.push(w);
    if (!isPunct) count++;
    const sentenceEnd = isPunct && /[.!?:]/.test(w.w);
    if (sentenceEnd || count >= maxWords) flush();
  }
  flush();
  return chunks;
};
