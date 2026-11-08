import type { ReactElement } from "react";

import type { CanvasStageProps } from "./canvas-stage-types.js";
import { InlinePromptSlot } from "./canvas-tool-slots.js";
import { MarqueeLayer } from "./marquee-layer.js";
import { FreeMoveSlot } from "./stage-parts.js";
import { VectorSlot } from "./vector-slot.js";

const StageLayers = ({
  edits,
  preview,
  props,
  stage,
}: CanvasStageProps): ReactElement => {
  const { active, pz, viewport } = stage;
  const { frames } = preview;
  const { freeMove, inlinePrompt, layerEdits } = edits;

  return (
    <>
      <InlinePromptSlot view={inlinePrompt} zoom={pz.zoom} frame={viewport} />
      <MarqueeLayer listen={frames.listen} />
      <VectorSlot
        projectId={props.projectId}
        directionId={props.directionId}
        zoom={pz.zoom}
        frame={viewport}
        post={frames.post}
        listen={frames.listen}
        notify={layerEdits.notify}
        page={active.path}
      />
      <FreeMoveSlot view={freeMove} />
    </>
  );
};

export { StageLayers };
