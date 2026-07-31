export type MarkerColor = "ink" | "blue" | "red" | "green";

export type BaseElement = {
  id: string;
  cue?: string;
  delay?: number;
  at: { x: number; y: number; w: number; h: number };
  color?: MarkerColor;
};

export type HandTextEl = BaseElement & {
  kind: "handtext";
  text: string;
  size: number;
  boxed?: boolean;
};

export type SketchEl = BaseElement & {
  kind: "sketch";
  shape: "rect" | "ellipse" | "arrow" | "line" | "cross";
};

export type BulletsEl = BaseElement & {
  kind: "bullets";
  size: number;
  items: { text: string; cue?: string }[];
};

export type CodeEl = BaseElement & {
  kind: "code";
  code: string;
  lang: string;
};

export type BarsEl = BaseElement & {
  kind: "bars";
  values: number[];
  labels: string[];
};

export type TokenStripEl = BaseElement & {
  kind: "tokenstrip";
  text: string; // chunks separated by |
  size: number;
};

export type SceneElement = HandTextEl | SketchEl | BulletsEl | CodeEl | BarsEl | TokenStripEl;

export type Beat = {
  id: string;
  narration: string;
  elements: SceneElement[];
};

export type Script = {
  sectionId: string;
  title: string;
  subtitle?: string;
  voice: string;
  speed?: number;
  seed: number;
  beats: Beat[];
};

export type TimedWord = { w: string; s: number; e: number };

export type BeatTiming = {
  id: string;
  wav: string;
  durationSec: number;
  words: TimedWord[];
};

export type Timing = {
  sectionId: string;
  voice: string;
  speed: number;
  beats: BeatTiming[];
};
