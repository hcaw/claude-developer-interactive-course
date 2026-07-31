// Stage 3: script.json -> narration WAVs + word-level timing.json via Kokoro-FastAPI.
// Usage: node pipeline/tts.mjs <section-id> [--host http://localhost:8880]
// Output: public/audio/<section-id>/beat-NN-<beatId>.wav + timing.json

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Agent, setGlobalDispatcher } from "undici";

// Kokoro on a busy CPU can take >5 min for a long beat; fetch's default
// headers timeout kills the request. Synthesis is legitimately slow, not hung.
setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));

const ROOT = new URL("..", import.meta.url).pathname;
const sectionId = process.argv[2];
if (!sectionId) {
  console.error("Usage: node pipeline/tts.mjs <section-id>");
  process.exit(1);
}
const host = process.argv.includes("--host")
  ? process.argv[process.argv.indexOf("--host") + 1]
  : "http://localhost:8880";

const script = JSON.parse(
  readFileSync(join(ROOT, "video-scripts", sectionId, "script.json"), "utf8")
);
const outDir = join(ROOT, "public", "audio", sectionId);
mkdirSync(outDir, { recursive: true });

// Kokoro streams its WAV with 0xFFFFFFFF placeholder sizes; patch the RIFF and
// data chunk sizes so ffmpeg/browsers get a well-formed file, and return the
// data chunk's offset/length for duration math.
function patchWavHeader(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF") throw new Error("not a RIFF file");
  buf.writeUInt32LE(buf.length - 8, 4);
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    let size = buf.readUInt32LE(off + 4);
    if (id === "data") {
      size = buf.length - off - 8;
      buf.writeUInt32LE(size, off + 4);
      return { dataOffset: off + 8, dataSize: size };
    }
    off += 8 + size + (size % 2);
  }
  throw new Error("no data chunk found");
}

function wavByteRate(buf) {
  // fmt chunk is directly after RIFF header in Kokoro output; scan to be safe.
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") return buf.readUInt32LE(off + 16);
    off += 8 + size + (size % 2);
  }
  throw new Error("no fmt chunk found");
}

const timing = {
  sectionId,
  voice: script.voice,
  speed: script.speed ?? 1.0,
  beats: [],
};

for (let i = 0; i < script.beats.length; i++) {
  const beat = script.beats[i];
  process.stdout.write(`TTS beat ${i + 1}/${script.beats.length} (${beat.id})... `);
  const res = await fetch(`${host}/dev/captioned_speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: beat.narration,
      voice: script.voice,
      speed: script.speed ?? 1.0,
      response_format: "wav",
      stream: false,
      return_timestamps: true,
    }),
  });
  if (!res.ok) throw new Error(`Kokoro ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const wav = Buffer.from(body.audio, "base64");
  const { dataSize } = patchWavHeader(wav);
  const durationSec = dataSize / wavByteRate(wav);

  const file = `beat-${String(i).padStart(2, "0")}-${beat.id}.wav`;
  writeFileSync(join(outDir, file), wav);

  timing.beats.push({
    id: beat.id,
    wav: `audio/${sectionId}/${file}`,
    durationSec: Number(durationSec.toFixed(3)),
    words: (body.timestamps ?? []).map((t) => ({
      w: t.word,
      s: Number(t.start_time.toFixed(3)),
      e: Number(t.end_time.toFixed(3)),
    })),
  });
  console.log(`${durationSec.toFixed(1)}s, ${body.timestamps?.length ?? 0} words`);
}

writeFileSync(join(outDir, "timing.json"), JSON.stringify(timing, null, 2));
const total = timing.beats.reduce((a, b) => a + b.durationSec, 0);
console.log(`Wrote ${timing.beats.length} beats, ${total.toFixed(1)}s total -> ${join("public/audio", sectionId)}`);
