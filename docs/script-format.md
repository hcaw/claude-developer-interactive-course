# script.json format reference

The contract between scriptwriting (Claude), TTS (`pipeline/tts.mjs`), and rendering (`video/src/`). Types are enforced in [video/src/types.ts](../video/src/types.ts); timing constants live in [video/src/timing-utils.ts](../video/src/timing-utils.ts).

## Top level

```jsonc
{
  "sectionId": "m1-02-how-llms-behave",  // = Remotion composition id; format m<module>-<section-dir>
  "title": "How LLMs Behave",
  "subtitle": "optional",
  "covers": [                             // the lessons this video narrates, repo-relative paths
    "course-content/.../01-teaching.md",  // in course order — the FIRST one renders the player,
    "course-content/.../02-watch-out.md"  // the rest link to it
  ],
  "voice": "af_heart",                    // any Kokoro voice id
  "speed": 1.0,
  "seed": 1102,                           // rough.js determinism; any int, unique per section
  "beats": [ /* Beat[] */ ]
}
```

The renderer ignores `covers`, but `webapp/scripts/generate-content.mjs` does not: it is the only
join between a video and the lessons it belongs to, replacing the old `m{module}-{NN}` filename
prefix ([adr/2026-08-04-11](adr/2026-08-04-11-lesson-as-the-unit.md)). Every path must resolve to a
real lesson, every mp4 needs a script and vice versa, and no lesson may be claimed by two videos —
`npm run content:gen` fails on all four. Editing `covers` alone never requires a re-render.

## Beat

One beat = one continuous narration take = one whiteboard scene (screen wipes between beats). 4–7 beats per video works well: intro hook → concepts → recap/try-it outro.

```jsonc
{
  "id": "tokens",            // stable slug; used in wav filenames
  "narration": "Spoken text sent to TTS verbatim.",
  "elements": [ /* SceneElement[] */ ]
}
```

## Elements — common fields

| Field | Meaning |
|---|---|
| `id` | Unique within beat. Seeds the rough.js randomness (stable id = stable wobble). |
| `cue` | Word/phrase from THIS beat's narration. Element starts drawing when it's spoken. Omit = beat start. |
| `delay` | Seconds added after the cue fires (stagger elements sharing a cue). |
| `at` | `{x, y, w, h}` in 1920×1080 canvas px. |
| `color` | `ink` (near-black) · `blue` · `red` (warnings) · `green` (positive/try-it). |

### Cue matching rules

Cues resolve against Kokoro's word timestamps: case- and punctuation-insensitive, multi-word cues must match **consecutive spoken words**, first occurrence wins. Unmatched cues log `cue not found` (visible in render/studio output) and fall back to beat start — always grep for that after adding a script. Pick distinctive words that occur once; don't cue on "the".

## Element kinds

| kind | Extra fields | Renders as | Draw time |
|---|---|---|---|
| `handtext` | `text`, `size` (px), `boxed?` | Caveat handwriting, written char-by-char; `boxed` draws a sketchy rect first, then centers text in it. `\n` allowed. | 0.4+0.05/char, cap 2.4s (+0.4 boxed) |
| `sketch` | `shape`: `rect`\|`ellipse`\|`arrow`\|`line`\|`cross` | rough.js stroke, drawn along the path. Arrow points right, spans `w`. | 0.9s (cross 0.5s) |
| `bullets` | `size`, `items: [{text, cue?}]` | Items write on at their own cues (or staggered if cueless). Per-item cues make lists land with narration — use them. | 0.7s/item |
| `code` | `code`, `lang` | White panel, sketchy border, monospace lines appear one-by-one. Font auto-shrinks to fit `h`; width does NOT auto-fit — keep lines ≤ `w`/18 chars at default size. | 0.6+0.4/line |
| `bars` | `values: number[]`, `labels: string[]` | Hand-drawn bar chart, bars rise staggered. Empty-string labels hide. | 1.4s |
| `tokenstrip` | `text` ("chunks\|split\|by\|pipes"), `size` | Sentence chopped into colored token boxes + "← tokens" tag. Purpose-built for tokenization visuals. | 1.6s |

## Timing model (renderer-owned, don't fight it)

- Video = 0.6s lead-in + beats back-to-back with 0.7s gaps + 1.8s tail. Duration comes entirely from the generated `timing.json`.
- Caption bar occupies bottom ≈ y>950 center — keep elements above y≈930, inside x∈[100,1820], below y≈80 (watermark top-right).

## Generated counterpart: timing.json

`pipeline/tts.mjs` writes `public/audio/<sectionId>/timing.json`: per beat `{id, wav, durationSec, words: [{w, s, e}]}` (seconds, beat-relative). The composition imports both files via `video/src/Root.tsx`; renders are reproducible without re-running TTS.

## Registering a section

In [video/src/Root.tsx](../video/src/Root.tsx): import both JSONs, append to `sections`. Composition id = `sectionId`.

## Full example

See [video-scripts/m1-02-how-llms-behave/script.json](../video-scripts/m1-02-how-llms-behave/script.json) — the verified POC covering every element kind.
