import React from "react";
import { Composition } from "remotion";
import { WhiteboardVideo } from "./WhiteboardVideo";
import { FPS, totalDurationSec } from "./timing-utils";
import type { Script, Timing } from "./types";

import script_m1_02 from "../../video-scripts/m1-02-how-llms-behave/script.json";
import timing_m1_02 from "../../public/audio/m1-02-how-llms-behave/timing.json";

// One entry per generated section. Batch generation will emit this list.
const sections: { script: Script; timing: Timing }[] = [
  {
    script: script_m1_02 as unknown as Script,
    timing: timing_m1_02 as unknown as Timing,
  },
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
