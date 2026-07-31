import React from "react";
import { HAND_FONT, colorOf } from "../theme";
import type { MarkerColor, TimedWord } from "../types";
import { cueTime } from "../timing-utils";

// Bullet list where each item writes on at its own cue (or staggered after the
// list's own start when the item has no cue).
export const Bullets: React.FC<{
  items: { text: string; cue?: string }[];
  size: number;
  color?: MarkerColor;
  listStartSec: number; // absolute start of the list element
  beatAudioStartSec: number; // absolute time narration of this beat starts
  words: TimedWord[];
  nowSec: number;
  itemDrawSec?: number;
}> = ({ items, size, color, listStartSec, beatAudioStartSec, words, nowSec, itemDrawSec = 0.7 }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.45 }}>
      {items.map((item, i) => {
        const start = item.cue
          ? beatAudioStartSec + cueTime(words, item.cue)
          : listStartSec + i * (itemDrawSec + 0.25);
        const progress = Math.max(0, Math.min(1, (nowSec - start) / itemDrawSec));
        if (progress <= 0) return <div key={i} style={{ height: size * 1.2 }} />;
        const chars = Array.from(item.text);
        const visible = Math.floor(progress * chars.length + 0.0001);
        return (
          <div
            key={i}
            style={{
              fontFamily: HAND_FONT,
              fontSize: size,
              fontWeight: 700,
              color: colorOf(color),
              lineHeight: 1.2,
              display: "flex",
              gap: 14,
            }}
          >
            <span style={{ opacity: progress > 0 ? 1 : 0 }}>•</span>
            <span>
              {chars.map((c, j) => (
                <span key={j} style={{ opacity: j < visible ? 1 : 0 }}>
                  {c}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
};
