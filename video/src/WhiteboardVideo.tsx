import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Beat, BeatTiming, SceneElement, Script, Timing } from "./types";
import { FPS, BEAT_GAP_SEC, TAIL_SEC, beatStartSec, cueTime } from "./timing-utils";
import { HAND_FONT, PAPER_BG, colorOf } from "./theme";
import { HandText } from "./components/HandText";
import { Sketch } from "./components/Sketch";
import { Bullets } from "./components/Bullets";
import { CodePanel } from "./components/CodePanel";
import { Bars } from "./components/Bars";
import { TokenStrip } from "./components/TokenStrip";
import { Captions } from "./components/Captions";

const drawDuration = (el: SceneElement): number => {
  switch (el.kind) {
    case "handtext":
      return Math.min(2.4, 0.4 + 0.05 * el.text.length) + (el.boxed ? 0.4 : 0);
    case "sketch":
      return el.shape === "cross" ? 0.5 : 0.9;
    case "code":
      return 0.6 + 0.4 * el.code.split("\n").length;
    case "bars":
      return 1.4;
    case "tokenstrip":
      return 1.6;
    case "bullets":
      return 0.7; // per-item timing lives in the component
  }
};

const Element: React.FC<{
  el: SceneElement;
  beatAudioStartSec: number;
  timing: BeatTiming;
  nowSec: number;
  seedBase: number;
}> = ({ el, beatAudioStartSec, timing, nowSec, seedBase }) => {
  const startSec = beatAudioStartSec + cueTime(timing.words, el.cue) + (el.delay ?? 0);
  const progress = Math.max(0, Math.min(1, (nowSec - startSec) / drawDuration(el)));
  if (progress <= 0 && el.kind !== "bullets") return null;

  const box: React.CSSProperties = {
    position: "absolute",
    left: el.at.x,
    top: el.at.y,
    width: el.at.w,
    height: el.at.h,
  };

  switch (el.kind) {
    case "handtext":
      return (
        <div style={box}>
          <HandText
            text={el.text}
            size={el.size}
            color={el.color}
            progress={progress}
            boxed={el.boxed}
            w={el.at.w}
            h={el.at.h}
            seedBase={seedBase}
            seedKey={el.id}
          />
        </div>
      );
    case "sketch":
      return (
        <div style={box}>
          <Sketch
            shape={el.shape}
            w={el.at.w}
            h={el.at.h}
            color={el.color}
            seedBase={seedBase}
            seedKey={el.id}
            progress={progress}
          />
        </div>
      );
    case "bullets":
      return (
        <div style={box}>
          <Bullets
            items={el.items}
            size={el.size}
            color={el.color}
            listStartSec={startSec}
            beatAudioStartSec={beatAudioStartSec}
            words={timing.words}
            nowSec={nowSec}
          />
        </div>
      );
    case "code":
      return (
        <div style={box}>
          <CodePanel
            code={el.code}
            w={el.at.w}
            h={el.at.h}
            progress={progress}
            seedBase={seedBase}
            seedKey={el.id}
          />
        </div>
      );
    case "bars":
      return (
        <div style={box}>
          <Bars
            values={el.values}
            labels={el.labels}
            w={el.at.w}
            h={el.at.h}
            color={el.color}
            progress={progress}
            seedBase={seedBase}
            seedKey={el.id}
          />
        </div>
      );
    case "tokenstrip":
      return (
        <div style={box}>
          <TokenStrip
            text={el.text}
            size={el.size}
            w={el.at.w}
            h={el.at.h}
            progress={progress}
            seedBase={seedBase}
            seedKey={el.id}
          />
        </div>
      );
  }
};

// Elements need ABSOLUTE video time. Beats render inside <Sequence>, so we
// compute time from the sequence-local frame plus the known beat offset,
// keeping cue math in one coordinate system (absolute seconds).
const BeatContent: React.FC<{
  beat: Beat;
  timing: BeatTiming;
  beatStart: number; // absolute sec where this beat's scene (and audio) starts
  seedBase: number;
}> = ({ beat, timing, beatStart, seedBase }) => {
  const frame = useCurrentFrame(); // local to the sequence
  const { fps } = useVideoConfig();
  const nowSec = beatStart + frame / fps;
  return (
    <AbsoluteFill>
      {beat.elements.map((el) => (
        <Element
          key={el.id}
          el={el}
          beatAudioStartSec={beatStart}
          timing={timing}
          nowSec={nowSec}
          seedBase={seedBase}
        />
      ))}
      <Captions words={timing.words} beatLocalSec={nowSec - beatStart} />
    </AbsoluteFill>
  );
};

export const WhiteboardVideo: React.FC<{ script: Script; timing: Timing }> = ({
  script,
  timing,
}) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        background: PAPER_BG,
        backgroundImage: "radial-gradient(#d8d5cb 1.2px, transparent 1.2px)",
        backgroundSize: "42px 42px",
      }}
    >
      {/* corner watermark */}
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 40,
          fontFamily: HAND_FONT,
          fontSize: 34,
          color: colorOf("ink"),
          opacity: 0.45,
        }}
      >
        Claude Developer Course · M{script.sectionId.slice(1, 2)}
      </div>
      {script.beats.map((beat, i) => {
        const bt = timing.beats[i];
        const start = beatStartSec(timing.beats, i);
        const durFrames = Math.ceil((bt.durationSec + BEAT_GAP_SEC + (i === script.beats.length - 1 ? TAIL_SEC : 0)) * fps);
        return (
          <Sequence key={beat.id} from={Math.round(start * fps)} durationInFrames={durFrames}>
            <Audio src={staticFile(bt.wav)} />
            <BeatContent beat={beat} timing={bt} beatStart={start} seedBase={script.seed} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
