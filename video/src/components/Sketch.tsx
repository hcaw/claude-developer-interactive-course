import React, { useMemo } from "react";
import rough from "roughjs";
import { evolvePath } from "@remotion/paths";
import { colorOf, hashSeed } from "../theme";
import type { MarkerColor } from "../types";

type Stroke = { d: string; strokeWidth: number };

const buildStrokes = (
  shape: "rect" | "ellipse" | "arrow" | "line" | "cross",
  w: number,
  h: number,
  seed: number
): Stroke[] => {
  const gen = rough.generator();
  const opts = { seed, roughness: 1.6, bowing: 1.2, strokeWidth: 4, stroke: "#000" };
  const drawables = [];
  switch (shape) {
    case "rect":
      drawables.push(gen.rectangle(4, 4, w - 8, h - 8, opts));
      break;
    case "ellipse":
      drawables.push(gen.ellipse(w / 2, h / 2, w - 8, h - 8, opts));
      break;
    case "line":
      drawables.push(gen.line(0, h / 2, w, h / 2, opts));
      break;
    case "arrow": {
      const y = h / 2;
      drawables.push(gen.line(0, y, w - 6, y, opts));
      drawables.push(gen.line(w - 30, y - 18, w - 4, y, opts));
      drawables.push(gen.line(w - 30, y + 18, w - 4, y, opts));
      break;
    }
    case "cross":
      drawables.push(gen.line(4, 4, w - 4, h - 4, opts));
      drawables.push(gen.line(w - 4, 4, 4, h - 4, opts));
      break;
  }
  const strokes: Stroke[] = [];
  for (const d of drawables) {
    for (const p of gen.toPaths(d)) {
      strokes.push({ d: p.d, strokeWidth: p.strokeWidth || 4 });
    }
  }
  return strokes;
};

export const Sketch: React.FC<{
  shape: "rect" | "ellipse" | "arrow" | "line" | "cross";
  w: number;
  h: number;
  color?: MarkerColor;
  seedBase: number;
  seedKey: string;
  progress: number; // 0..1 draw progress
}> = ({ shape, w, h, color, seedBase, seedKey, progress }) => {
  const strokes = useMemo(
    () => buildStrokes(shape, w, h, (hashSeed(seedBase, seedKey) % 100000) + 1),
    [shape, w, h, seedBase, seedKey]
  );
  const stroke = colorOf(color);
  // Draw strokes sequentially: stroke i occupies [i/n, (i+1)/n] of progress.
  const n = strokes.length;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ overflow: "visible", display: "block" }}
    >
      {strokes.map((s, i) => {
        const local = Math.max(0, Math.min(1, progress * n - i));
        if (local <= 0) return null;
        const ev = evolvePath(local, s.d);
        return (
          <path
            key={i}
            d={s.d}
            fill="none"
            stroke={stroke}
            strokeWidth={s.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={ev.strokeDasharray}
            strokeDashoffset={ev.strokeDashoffset}
          />
        );
      })}
    </svg>
  );
};
