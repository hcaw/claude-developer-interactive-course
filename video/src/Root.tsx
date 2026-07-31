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

// One entry per generated section. Batch generation will emit this list.
const sections: { script: Script; timing: Timing }[] = [
  { script: script_m1_01 as unknown as Script, timing: timing_m1_01 as unknown as Timing },
  { script: script_m1_02 as unknown as Script, timing: timing_m1_02 as unknown as Timing },
  { script: script_m1_03 as unknown as Script, timing: timing_m1_03 as unknown as Timing },
  { script: script_m1_04 as unknown as Script, timing: timing_m1_04 as unknown as Timing },
  { script: script_m1_05 as unknown as Script, timing: timing_m1_05 as unknown as Timing },
  { script: script_m1_06 as unknown as Script, timing: timing_m1_06 as unknown as Timing },
  { script: script_m1_06q as unknown as Script, timing: timing_m1_06q as unknown as Timing },
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
