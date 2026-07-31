import React, { useMemo } from "react";
import { HAND_FONT, MARKER } from "../theme";
import type { TimedWord } from "../types";
import { captionChunks } from "../timing-utils";

// Bottom caption bar: shows the current phrase, highlights the word being spoken.
export const Captions: React.FC<{
  words: TimedWord[];
  beatLocalSec: number; // seconds into this beat's audio
}> = ({ words, beatLocalSec }) => {
  const chunks = useMemo(() => captionChunks(words), [words]);
  const chunk = chunks.find((c) => beatLocalSec >= c.start - 0.15 && beatLocalSec <= c.end + 0.35);
  if (!chunk) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 36,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#2b2b3acc",
          borderRadius: 14,
          padding: "10px 28px",
          fontFamily: HAND_FONT,
          fontSize: 40,
          fontWeight: 700,
          maxWidth: 1500,
          textAlign: "center",
        }}
      >
        {chunk.words.map((w, i) => {
          const active = beatLocalSec >= w.s && beatLocalSec < w.e + 0.05;
          const isPunct = /^[^a-zA-Z0-9]+$/.test(w.w);
          return (
            <span
              key={i}
              style={{ color: active && !isPunct ? "#ffd43b" : "#ffffff" }}
            >
              {isPunct ? w.w : (i === 0 ? "" : " ") + w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
