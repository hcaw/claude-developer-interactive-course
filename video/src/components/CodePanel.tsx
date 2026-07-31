import React from "react";
import { CODE_FONT, colorOf } from "../theme";
import { Sketch } from "./Sketch";

// A sketchy panel whose code lines appear one by one.
export const CodePanel: React.FC<{
  code: string;
  w: number;
  h: number;
  progress: number;
  seedBase: number;
  seedKey: string;
}> = ({ code, w, h, progress, seedBase, seedKey }) => {
  const lines = code.split("\n");
  const boxProgress = Math.min(1, progress / 0.3);
  const codeProgress = Math.max(0, (progress - 0.3) / 0.7);
  const visibleLines = Math.ceil(codeProgress * lines.length);
  const maxLineLen = Math.max(...lines.map((l) => l.length), 1);
  // Fit height AND width (monospace glyph ≈ 0.62em wide).
  const fontSize = Math.min(30, (h - 40) / lines.length / 1.5, (w - 52) / (maxLineLen * 0.62));
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div style={{ position: "absolute", inset: 0, background: "#ffffffcc", borderRadius: 8 }} />
      <div style={{ position: "absolute", inset: 0 }}>
        <Sketch
          shape="rect"
          w={w}
          h={h}
          color="ink"
          seedBase={seedBase}
          seedKey={seedKey + "-panel"}
          progress={boxProgress}
        />
      </div>
      <pre
        style={{
          position: "absolute",
          inset: 0,
          margin: 0,
          padding: "18px 24px",
          fontFamily: CODE_FONT,
          fontSize,
          lineHeight: 1.5,
          color: colorOf("ink"),
          overflow: "hidden",
        }}
      >
        {lines.slice(0, visibleLines).join("\n")}
      </pre>
    </div>
  );
};
