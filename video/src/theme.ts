import { loadFont } from "@remotion/google-fonts/Caveat";
import type { MarkerColor } from "./types";

const { fontFamily } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const HAND_FONT = fontFamily;
export const CODE_FONT = "Menlo, Consolas, monospace";

export const PAPER_BG = "#fbfaf6";

export const MARKER: Record<MarkerColor, string> = {
  ink: "#2b2b3a",
  blue: "#1971c2",
  red: "#e03131",
  green: "#2f9e44",
};

export const colorOf = (c: MarkerColor | undefined): string => MARKER[c ?? "ink"];

// Stable small hash for per-element rough.js seeds.
export const hashSeed = (base: number, key: string): number => {
  let h = base;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) % 2147483647;
  }
  return h;
};
