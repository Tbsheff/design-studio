import type { ReactElement } from "react";

import { AgentPresenceLayer } from "./agent-presence-layer.js";
import type { StageSlotProps } from "./canvas-stage-types.js";
import { FreeMoveSlot } from "./free-move-slot.js";
import { MarqueeLayer } from "./marquee-layer.js";
import { VectorSlot } from "./vector-slot.js";

const StageLayers = ({
  edits,
  preview,
  props,
  stage,
}: StageSlotProps): ReactElement => {
  const { active, pz, viewport } = stage;
  const { frames } = preview;
  const { freeMove, layerEdits } = edits;

  return (
    <>
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
      <AgentPresenceLayer
        frames={stage.canvasFrames.layout.frames}
        offset={active}
        presence={edits.presence}
        zoom={pz.zoom}
      />
    </>
  );
};

export { StageLayers };
