import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { frameDirection } from "./canvas-direction-ops.js";
import { CanvasSectionsLayer } from "./canvas-sections-layer.js";
import type { CanvasStageProps } from "./canvas-stage-types.js";
import { FrameLabel } from "./frame-label.js";
import { FrameResizeHandles } from "./frame-resize-handles.js";
import type { ResizeEdge } from "./frame-resize-handles.js";
import { FrameSnapLayer } from "./frame-snap-layer.js";
import { OtherFrames } from "./other-frames.js";

const StageFrames = ({
  preview,
  props,
  stage,
  wiring,
}: CanvasStageProps): ReactElement => {
  const { active, firstBuild, shown } = stage;
  const { labelProps, onResizeStart, proto, registerPassive, sandbox } = wiring;
  const label = labelProps(active, frameDirection(active, props.directionId));

  const {
    onActivate,
    onBodyPointerDown,
    onNudge,
    onPointerDown,
    onRemove,
    onResizeStart: labelResizeStart,
  } = label;

  const resize = useCallback(
    (event: ReactPointerEvent, edge: ResizeEdge) =>
      onResizeStart(event, active, edge),
    [onResizeStart, active]
  );

  return (
    <>
      <CanvasSectionsLayer
        projectId={props.projectId}
        freeze={stage.pz.freeze}
        offset={active}
        zoom={stage.pz.zoom}
      />
      <FrameLabel
        frame={label.frame}
        active={label.active}
        removable={label.removable}
        directionId={label.directionId}
        badge={label.badge}
        number={label.number}
        title={label.title}
        extras={label.extras}
        note={wiring.appCanvas.note}
        onPointerDown={onPointerDown}
        onBodyPointerDown={onBodyPointerDown}
        onActivate={onActivate}
        onRemove={onRemove}
        onNudge={onNudge}
        onResizeStart={labelResizeStart}
      />
      <FrameResizeHandles onPointerDown={resize} />
      <OtherFrames
        frames={shown}
        active={active}
        passive={preview.passive}
        sandbox={sandbox}
        labelProps={labelProps}
        register={registerPassive}
        waiting={firstBuild.waitFor}
        steps={props.steps}
      />
      <FrameSnapLayer origin={active} />
      {proto.artboard}
    </>
  );
};

export { StageFrames };
