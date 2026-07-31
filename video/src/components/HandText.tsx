import React from "react";
import { HAND_FONT, colorOf } from "../theme";
import type { MarkerColor } from "../types";
import { Sketch } from "./Sketch";

// Handwriting-font text that appears character by character, like being written.
export const HandText: React.FC<{
  text: string;
  size: number;
  color?: MarkerColor;
  progress: number;
  boxed?: boolean;
  w: number;
  h: number;
  seedBase: number;
  seedKey: string;
}> = ({ text, size, color, progress, boxed, w, h, seedBase, seedKey }) => {
  const chars = Array.from(text);
  // With a box, the border draws during the first 35% and text follows.
  const boxProgress = boxed ? Math.min(1, progress / 0.35) : 0;
  const textProgress = boxed ? Math.max(0, (progress - 0.35) / 0.65) : progress;
  const visible = Math.floor(textProgress * chars.length + 0.0001);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {boxed ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <Sketch
            shape="rect"
            w={w}
            h={h}
            color={color}
            seedBase={seedBase}
            seedKey={seedKey + "-box"}
            progress={boxProgress}
          />
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: boxed ? "center" : "flex-start",
          fontFamily: HAND_FONT,
          fontSize: size,
          fontWeight: 700,
          color: colorOf(color),
          lineHeight: 1.15,
          whiteSpace: "pre-line",
          padding: boxed ? "0 16px" : 0,
        }}
      >
        <span>
          {chars.map((c, i) => (
            <span key={i} style={{ opacity: i < visible ? 1 : 0 }}>
              {c}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
};
