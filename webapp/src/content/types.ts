// Shapes of the generated content files. Kept in sync by hand with scripts/generate-content.mjs —
// if you change the generator's output, change these too.
//
// The block set is closed (docs/wiki/course-content-inventory.md): the parser emits exactly these
// six types and nothing else, which is why the renderer can be exhaustive without a fallback.

export type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; label: string | null; text: string; disclaimer: boolean }
  | { type: "table"; rows: string[][] }
  | { type: "code"; lang: string; code: string };

export type QuizOption = { letter: string; text: string };

export type QuizQuestion = {
  /** Heading + any blocks between it and the option list. */
  prompt: Block[];
  options: QuizOption[];
};

export type Assessment =
  | { kind: "quiz"; questions: QuizQuestion[]; trailing: Block[] }
  | { kind: "freeform" };

export type Article = {
  /** Source file path, e.g. `course-content/module-1-.../01-quiz.md`. Stable primary key. */
  key: string;
  title: string;
  /** Frontmatter `article_type`: Concept, Recap, Checkpoint, Quiz, Exercise, Cumulative, … */
  type: string;
  durationMin: number | null;
  assessment: Assessment | null;
  /** For quiz articles this is the intro only — the questions live in `assessment`. */
  blocks: Block[];
};

export type VideoRef = {
  /** MP4 basename, e.g. `m1-02-how-llms-behave`. The `video_progress.video_id` value. */
  videoId: string;
  /** Path under the video base URL, e.g. `module-1/m1-01-orientation.mp4`. */
  path: string;
};

export type Section = {
  id: string;
  module: number;
  moduleTitle: string;
  section: number;
  title: string;
  /** Null for the two "module complete" sections. */
  video: VideoRef | null;
  /** Tracked for resume, but never a completion requirement. */
  debriefVideo: VideoRef | null;
  articles: Article[];
};

export type ModuleRef = { module: number; title: string; sectionIds: string[] };

export type Manifest = {
  modules: ModuleRef[];
  sections: Section[];
  /** Sections with no video and no assessment — completable only via the "Mark complete" button. */
  zeroRequirementSections: string[];
};

// --- answer key (server-only; see answer-key.ts) ---------------------------

export type QuizAnswer = { letter: string; explanation: string };

export type AnswerKeyEntry =
  | { kind: "quiz"; answers: QuizAnswer[]; debrief: Block[] }
  | { kind: "freeform"; modelAnswer: Block[] };

export type AnswerKey = Record<string, AnswerKeyEntry>;
