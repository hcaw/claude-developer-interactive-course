import React from "react";
import { HAND_FONT, colorOf } from "../theme";
import type { MarkerColor } from "../types";
import { Sketch } from "./Sketch";

// A hand-drawn bar chart (probability distribution); bars rise staggered.
export const Bars: React.FC<{
  values: number[];
  labels: string[];
  w: number;
  h: number;
  color?: MarkerColor;
  progress: number;
  seedBase: number;
  seedKey: string;
}> = ({ values, labels, w, h, color, progress, seedBase, seedKey }) => {
  const n = values.length;
  const labelSpace = labels.some((l) => l) ? 44 : 10;
  const chartH = h - labelSpace;
  const slot = w / n;
  const barW = slot * 0.6;
  const max = Math.max(...values);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {values.map((v, i) => {
        const local = Math.max(0, Math.min(1, progress * n - i));
        if (local <= 0) return null;
        const barH = Math.max(12, (v / max) * chartH);
        return (
          <div
            key={i}
            style={{ position: "absolute", left: i * slot + (slot - barW) / 2, top: chartH - barH }}
          >
            <Sketch
              shape="rect"
              w={barW}
              h={barH}
              color={color}
              seedBase={seedBase}
              seedKey={`${seedKey}-bar${i}`}
              progress={local}
            />
          </div>
        );
      })}
      {labels.map((label, i) =>
        label ? (
          <div
            key={`l${i}`}
            style={{
              position: "absolute",
              left: i * slot,
              top: chartH + 4,
              width: slot,
              textAlign: "center",
              fontFamily: HAND_FONT,
              fontSize: 30,
              fontWeight: 700,
              color: colorOf(color),
              opacity: progress * n - i > 0.5 ? 1 : 0,
            }}
          >
            {label}
          </div>
        ) : null
      )}
    </div>
  );
};
