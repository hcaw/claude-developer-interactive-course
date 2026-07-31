import React from "react";
import { Composition } from "remotion";
import { WhiteboardVideo } from "./WhiteboardVideo";
import { FPS, totalDurationSec } from "./timing-utils";
import type { Script, Timing } from "./types";

import script_m1_01 from "../../video-scripts/m1-01-orientation/script.json";
import timing_m1_01 from "../../public/audio/m1-01-orientation/timing.json";
import script_m1_02 from "../../video-scripts/m1-02-how-llms-behave/script.json";
import timing_m1_02 from "../../public/audio/m1-02-how-llms-behave/timing.json";
import script_m1_03 from "../../video-scripts/m1-03-models-and-reasoning/script.json";
import timing_m1_03 from "../../public/audio/m1-03-models-and-reasoning/timing.json";
import script_m1_04 from "../../video-scripts/m1-04-prompting-modes/script.json";
import timing_m1_04 from "../../public/audio/m1-04-prompting-modes/timing.json";
import script_m1_05 from "../../video-scripts/m1-05-technical-substrate/script.json";
import timing_m1_05 from "../../public/audio/m1-05-technical-substrate/timing.json";
import script_m1_06 from "../../video-scripts/m1-06-module-wrap-up/script.json";
import timing_m1_06 from "../../public/audio/m1-06-module-wrap-up/timing.json";
import script_m1_06q from "../../video-scripts/m1-06-quiz-debrief/script.json";
import timing_m1_06q from "../../public/audio/m1-06-quiz-debrief/timing.json";
import script_m2_01 from "../../video-scripts/m2-01-orientation/script.json";
import timing_m2_01 from "../../public/audio/m2-01-orientation/timing.json";
import script_m2_02 from "../../video-scripts/m2-02-prompting-craft/script.json";
import timing_m2_02 from "../../public/audio/m2-02-prompting-craft/timing.json";
import script_m2_02c from "../../video-scripts/m2-02-checkpoint-debrief/script.json";
import timing_m2_02c from "../../public/audio/m2-02-checkpoint-debrief/timing.json";
import script_m2_03 from "../../video-scripts/m2-03-extended-thinking/script.json";
import timing_m2_03 from "../../public/audio/m2-03-extended-thinking/timing.json";
import script_m2_03c from "../../video-scripts/m2-03-checkpoint-debrief/script.json";
import timing_m2_03c from "../../public/audio/m2-03-checkpoint-debrief/timing.json";
import script_m2_04 from "../../video-scripts/m2-04-tool-use-and-schema-design/script.json";
import timing_m2_04 from "../../public/audio/m2-04-tool-use-and-schema-design/timing.json";
import script_m2_04c from "../../video-scripts/m2-04-checkpoint-debrief/script.json";
import timing_m2_04c from "../../public/audio/m2-04-checkpoint-debrief/timing.json";
import script_m2_05 from "../../video-scripts/m2-05-streaming-responses/script.json";
import timing_m2_05 from "../../public/audio/m2-05-streaming-responses/timing.json";
import script_m2_05c from "../../video-scripts/m2-05-checkpoint-debrief/script.json";
import timing_m2_05c from "../../public/audio/m2-05-checkpoint-debrief/timing.json";
import script_m2_06 from "../../video-scripts/m2-06-context-engineering/script.json";
import timing_m2_06 from "../../public/audio/m2-06-context-engineering/timing.json";
import script_m2_06c from "../../video-scripts/m2-06-checkpoint-debrief/script.json";
import timing_m2_06c from "../../public/audio/m2-06-checkpoint-debrief/timing.json";
import script_m2_07 from "../../video-scripts/m2-07-agent-construction/script.json";
import timing_m2_07 from "../../public/audio/m2-07-agent-construction/timing.json";
import script_m2_07c from "../../video-scripts/m2-07-checkpoint-debrief/script.json";
import timing_m2_07c from "../../public/audio/m2-07-checkpoint-debrief/timing.json";
import script_m2_08 from "../../video-scripts/m2-08-agent-memory/script.json";
import timing_m2_08 from "../../public/audio/m2-08-agent-memory/timing.json";
import script_m2_08c from "../../video-scripts/m2-08-checkpoint-debrief/script.json";
import timing_m2_08c from "../../public/audio/m2-08-checkpoint-debrief/timing.json";
import script_m2_09c from "../../video-scripts/m2-09-cumulative-debrief/script.json";
import timing_m2_09c from "../../public/audio/m2-09-cumulative-debrief/timing.json";
import script_m2_10 from "../../video-scripts/m2-10-multimodal-and-batch/script.json";
import timing_m2_10 from "../../public/audio/m2-10-multimodal-and-batch/timing.json";
import script_m2_10c from "../../video-scripts/m2-10-checkpoint-debrief/script.json";
import timing_m2_10c from "../../public/audio/m2-10-checkpoint-debrief/timing.json";
import script_m2_11 from "../../video-scripts/m2-11-module-wrap-up/script.json";
import timing_m2_11 from "../../public/audio/m2-11-module-wrap-up/timing.json";
import script_m3_01 from "../../video-scripts/m3-01-module-introduction/script.json";
import timing_m3_01 from "../../public/audio/m3-01-module-introduction/timing.json";
import script_m3_02 from "../../video-scripts/m3-02-permission-modes/script.json";
import timing_m3_02 from "../../public/audio/m3-02-permission-modes/timing.json";
import script_m3_02c from "../../video-scripts/m3-02-checkpoint-debrief/script.json";
import timing_m3_02c from "../../public/audio/m3-02-checkpoint-debrief/timing.json";
import script_m3_03 from "../../video-scripts/m3-03-durable-project-context/script.json";
import timing_m3_03 from "../../public/audio/m3-03-durable-project-context/timing.json";
import script_m3_03c from "../../video-scripts/m3-03-checkpoint-debrief/script.json";
import timing_m3_03c from "../../public/audio/m3-03-checkpoint-debrief/timing.json";
import script_m3_04 from "../../video-scripts/m3-04-packaging-workflows/script.json";
import timing_m3_04 from "../../public/audio/m3-04-packaging-workflows/timing.json";
import script_m3_04c from "../../video-scripts/m3-04-checkpoint-debrief/script.json";
import timing_m3_04c from "../../public/audio/m3-04-checkpoint-debrief/timing.json";
import script_m3_05 from "../../video-scripts/m3-05-mcp-servers/script.json";
import timing_m3_05 from "../../public/audio/m3-05-mcp-servers/timing.json";
import script_m3_05c from "../../video-scripts/m3-05-checkpoint-debrief/script.json";
import timing_m3_05c from "../../public/audio/m3-05-checkpoint-debrief/timing.json";
import script_m3_06 from "../../video-scripts/m3-06-enterprise-integration/script.json";
import timing_m3_06 from "../../public/audio/m3-06-enterprise-integration/timing.json";
import script_m3_06c from "../../video-scripts/m3-06-checkpoint-debrief/script.json";
import timing_m3_06c from "../../public/audio/m3-06-checkpoint-debrief/timing.json";
import script_m3_07c from "../../video-scripts/m3-07-cumulative-debrief/script.json";
import timing_m3_07c from "../../public/audio/m3-07-cumulative-debrief/timing.json";
import script_m3_08 from "../../video-scripts/m3-08-key-takeaways/script.json";
import timing_m3_08 from "../../public/audio/m3-08-key-takeaways/timing.json";

// One entry per generated section. Batch generation will emit this list.
const sections: { script: Script; timing: Timing }[] = [
  { script: script_m1_01 as unknown as Script, timing: timing_m1_01 as unknown as Timing },
  { script: script_m1_02 as unknown as Script, timing: timing_m1_02 as unknown as Timing },
  { script: script_m1_03 as unknown as Script, timing: timing_m1_03 as unknown as Timing },
  { script: script_m1_04 as unknown as Script, timing: timing_m1_04 as unknown as Timing },
  { script: script_m1_05 as unknown as Script, timing: timing_m1_05 as unknown as Timing },
  { script: script_m1_06 as unknown as Script, timing: timing_m1_06 as unknown as Timing },
  { script: script_m1_06q as unknown as Script, timing: timing_m1_06q as unknown as Timing },
  { script: script_m2_01 as unknown as Script, timing: timing_m2_01 as unknown as Timing },
  { script: script_m2_02 as unknown as Script, timing: timing_m2_02 as unknown as Timing },
  { script: script_m2_02c as unknown as Script, timing: timing_m2_02c as unknown as Timing },
  { script: script_m2_03 as unknown as Script, timing: timing_m2_03 as unknown as Timing },
  { script: script_m2_03c as unknown as Script, timing: timing_m2_03c as unknown as Timing },
  { script: script_m2_04 as unknown as Script, timing: timing_m2_04 as unknown as Timing },
  { script: script_m2_04c as unknown as Script, timing: timing_m2_04c as unknown as Timing },
  { script: script_m2_05 as unknown as Script, timing: timing_m2_05 as unknown as Timing },
  { script: script_m2_05c as unknown as Script, timing: timing_m2_05c as unknown as Timing },
  { script: script_m2_06 as unknown as Script, timing: timing_m2_06 as unknown as Timing },
  { script: script_m2_06c as unknown as Script, timing: timing_m2_06c as unknown as Timing },
  { script: script_m2_07 as unknown as Script, timing: timing_m2_07 as unknown as Timing },
  { script: script_m2_07c as unknown as Script, timing: timing_m2_07c as unknown as Timing },
  { script: script_m2_08 as unknown as Script, timing: timing_m2_08 as unknown as Timing },
  { script: script_m2_08c as unknown as Script, timing: timing_m2_08c as unknown as Timing },
  { script: script_m2_09c as unknown as Script, timing: timing_m2_09c as unknown as Timing },
  { script: script_m2_10 as unknown as Script, timing: timing_m2_10 as unknown as Timing },
  { script: script_m2_10c as unknown as Script, timing: timing_m2_10c as unknown as Timing },
  { script: script_m2_11 as unknown as Script, timing: timing_m2_11 as unknown as Timing },
  { script: script_m3_01 as unknown as Script, timing: timing_m3_01 as unknown as Timing },
  { script: script_m3_02 as unknown as Script, timing: timing_m3_02 as unknown as Timing },
  { script: script_m3_02c as unknown as Script, timing: timing_m3_02c as unknown as Timing },
  { script: script_m3_03 as unknown as Script, timing: timing_m3_03 as unknown as Timing },
  { script: script_m3_03c as unknown as Script, timing: timing_m3_03c as unknown as Timing },
  { script: script_m3_04 as unknown as Script, timing: timing_m3_04 as unknown as Timing },
  { script: script_m3_04c as unknown as Script, timing: timing_m3_04c as unknown as Timing },
  { script: script_m3_05 as unknown as Script, timing: timing_m3_05 as unknown as Timing },
  { script: script_m3_05c as unknown as Script, timing: timing_m3_05c as unknown as Timing },
  { script: script_m3_06 as unknown as Script, timing: timing_m3_06 as unknown as Timing },
  { script: script_m3_06c as unknown as Script, timing: timing_m3_06c as unknown as Timing },
  { script: script_m3_07c as unknown as Script, timing: timing_m3_07c as unknown as Timing },
  { script: script_m3_08 as unknown as Script, timing: timing_m3_08 as unknown as Timing },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {sections.map(({ script, timing }) => (
        <Composition
          key={script.sectionId}
          id={script.sectionId}
          component={WhiteboardVideo}
          durationInFrames={Math.ceil(totalDurationSec(timing.beats) * FPS)}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{ script, timing }}
        />
      ))}
    </>
  );
};
