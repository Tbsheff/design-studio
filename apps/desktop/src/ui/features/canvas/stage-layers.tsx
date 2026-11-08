import { Suspense } from "react";
import type { ReactElement } from "react";

import type { StageSlotProps } from "./canvas-stage-types.js";
import { FreeMoveSlot } from "./free-move-slot.js";
import { MarqueeLayer } from "./marquee-layer.js";
import { VectorSlot } from "./vector-slot.js";

const StageLayers = ({
  edits,
  preview,
  props,
  slots,
  stage,
}: StageSlotProps): ReactElement => {
  const { active, pz, viewport } = stage;
  const { InlinePrompt } = slots;
  const { frames } = preview;
  const { freeMove, inlinePrompt, layerEdits } = edits;

  return (
    <>
      {inlinePrompt && (
        <Suspense fallback={null}>
          <InlinePrompt view={inlinePrompt} zoom={pz.zoom} frame={viewport} />
        </Suspense>
      )}
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
