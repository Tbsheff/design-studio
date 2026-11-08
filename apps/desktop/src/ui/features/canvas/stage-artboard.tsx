import { useMemo } from "react";
import type { ReactElement } from "react";

import type { StageSlotProps } from "./canvas-stage-types.js";
import { toArtboardStyle } from "./stage-artboard-model.js";
import { StageFrames } from "./stage-frames.js";
import { StageLayers } from "./stage-layers.js";
import { StageOverlay } from "./stage-overlay.js";
import { PreviewSlots, StepCover } from "./stage-parts.js";

const StageArtboard = ({
  edits,
  preview,
  props,
  slots,
  stage,
  variant,
  wiring,
}: StageSlotProps): ReactElement => {
  const { active, artboardRef, firstBuild, note, viewport } = stage;

  const { covered, frames } = preview;
  const { TabOrder } = slots;

  const style = useMemo(
    () => toArtboardStyle(viewport.width, viewport.height, note === "empty"),
    [viewport.width, viewport.height, note]
  );

  return (
    <div
      ref={artboardRef}
      className="artboard"
      data-frame-id={active.id}
      data-direction-id={props.directionId || null}
      style={style}
    >
      <PreviewSlots
        frames={frames}
        sandbox={wiring.sandbox}
        viewport={viewport}
      />
      <StepCover
        steps={props.steps}
        covered={covered}
        wait={firstBuild.wait}
        path={active.path}
      />
      <TabOrder
        projectId={props.projectId}
        directionId={props.directionId}
        frameId={active.id}
        frames={frames}
        kind={props.kind}
        isBlocked={stage.protoOn}
        lastChange={props.lastChange}
        zoom={stage.pz.zoom}
      />
      <StageOverlay
        slots={slots}
        variant={variant}
        props={props}
        stage={stage}
        preview={preview}
        edits={edits}
        wiring={wiring}
      />
      <StageLayers
        slots={slots}
        variant={variant}
        props={props}
        stage={stage}
        preview={preview}
        edits={edits}
        wiring={wiring}
      />
      <StageFrames
        props={props}
        stage={stage}
        preview={preview}
        edits={edits}
        wiring={wiring}
      />
    </div>
  );
};

export { StageArtboard };
