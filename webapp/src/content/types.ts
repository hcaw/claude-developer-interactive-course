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
  /**
   * More than one letter is correct — render checkboxes instead of radios. Deliberately a
   * boolean, never the count: shipping "pick 2" would spoil questions whose prose withholds it.
   */
  multi: boolean;
};

export type Assessment =
  | { kind: "quiz"; questions: QuizQuestion[]; trailing: Block[] }
  | { kind: "freeform" };

export type LessonVideo = {
  /** MP4 basename, e.g. `m3-02-permission-modes`. The `video_progress.video_id` value. */
  videoId: string;
  /** Path under the video base URL, e.g. `module-3/m3-02-permission-modes.mp4`. */
  path: string;
  /** False for debriefs: tracked for resume, never a completion requirement. */
  required: boolean;
  /**
   * Null when this lesson renders the player. Otherwise the slug of the lesson that does — one
   * video often narrates a teaching lesson and its watch-out story, and embedding it twice on
   * consecutive pages would just invite watching it twice.
   */
  playerOn: string | null;
};

/**
 * One authored article: one page, one URL, one unit of completion (adr/2026-08-04-11).
 */
export type Lesson = {
  /** Source file path, e.g. `course-content/module-1-.../01-quiz.md`. Stable primary key. */
  key: string;
  /** URL segment under /lessons. Unique course-wide; asserted at generate time. */
  slug: string;
  /** Position in course order — drives prev/next. */
  order: number;
  module: number;
  moduleTitle: string;
  /** The heading this lesson is listed under on the module page. Not a route, not a progress unit. */
  group: string;
  groupOrder: number;
  title: string;
  /** Frontmatter `article_type`: Teaching, Watch Out, Checkpoint, Quiz, Glossary, … — the badge. */
  type: string;
  durationMin: number | null;
  video: LessonVideo | null;
  assessment: Assessment | null;
  /** For quiz lessons this is the intro only — the questions live in `assessment`. */
  blocks: Block[];
};

export type ModuleRef = { module: number; title: string; lessonKeys: string[] };

export type Manifest = {
  modules: ModuleRef[];
  lessons: Lesson[];
  /** Lessons with nothing to watch and nothing to answer — completed by reading them. */
  viewOnlyLessonKeys: string[];
};

// --- answer key (server-only; see answer-key.ts) ---------------------------

/** One or more correct letters — a set, compared as a set (adr/2026-08-04-12). */
export type QuizAnswer = { letters: string[]; explanation: string };

export type AnswerKeyEntry =
  | { kind: "quiz"; answers: QuizAnswer[]; debrief: Block[] }
  | { kind: "freeform"; modelAnswer: Block[] };

export type AnswerKey = Record<string, AnswerKeyEntry>;
