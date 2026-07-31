import React from "react";
import { HAND_FONT, MARKER, colorOf } from "../theme";
import { Sketch } from "./Sketch";
import type { MarkerColor } from "../types";

const CHUNK_COLORS: MarkerColor[] = ["blue", "red", "green", "ink"];

// A sentence chopped into token chunks, each boxed in its own marker color.
export const TokenStrip: React.FC<{
  text: string; // chunks separated by |
  size: number;
  w: number;
  h: number;
  progress: number;
  seedBase: number;
  seedKey: string;
}> = ({ text, size, w, h, progress, seedBase, seedKey }) => {
  const chunks = text.split("|");
  const n = chunks.length;
  const totalChars = chunks.reduce((a, c) => a + c.length, 0);
  let acc = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", width: w, height: h }}>
      {chunks.map((chunk, i) => {
        const local = Math.max(0, Math.min(1, progress * n - i));
        const color = CHUNK_COLORS[i % CHUNK_COLORS.length];
        const chunkW = Math.max(size * 1.1, (chunk.length / totalChars) * (w - n * 14));
        acc += chunk.length;
        return (
          <div key={i} style={{ position: "relative", height: size * 1.8, width: chunkW, marginRight: 14 }}>
            {local > 0 ? (
              <>
                <div style={{ position: "absolute", inset: 0 }}>
                  <Sketch
                    shape="rect"
                    w={chunkW}
                    h={size * 1.8}
                    color={color}
                    seedBase={seedBase}
                    seedKey={`${seedKey}-tok${i}`}
                    progress={local}
                  />
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: HAND_FONT,
                    fontSize: size,
                    fontWeight: 700,
                    color: MARKER[color],
                    opacity: local > 0.5 ? 1 : 0,
                    whiteSpace: "pre",
                  }}
                >
                  {chunk}
                </div>
              </>
            ) : null}
          </div>
        );
      })}
      <div
        style={{
          fontFamily: HAND_FONT,
          fontSize: size * 0.75,
          color: colorOf("ink"),
          marginLeft: 16,
          opacity: progress >= 1 ? 1 : 0,
        }}
      >
        ← tokens
      </div>
    </div>
  );
};
