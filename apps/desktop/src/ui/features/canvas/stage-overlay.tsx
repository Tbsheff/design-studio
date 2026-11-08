import { Suspense, useMemo } from "react";
import type { ReactElement } from "react";

import { activeFrameOf, commentToolsOf, inEditPane } from "./canvas-helpers.js";
import type { StageSlotProps } from "./canvas-stage-types.js";
import { CanvasComments } from "./canvas-tool-slots.js";
import { LiveOverlay } from "./stage-parts.js";

const StageOverlay = ({
  edits,
  preview,
  props,
  slots,
  stage,
  variant,
}: StageSlotProps): ReactElement => {
  const { active, comment, draw, layout, pane, pz, viewport } = stage;
  const { frames } = preview;
  const { resize, spacingHost } = edits;
  const { Grid, Spacing } = slots;

  const spacing = useMemo(
    () => (
      <Suspense fallback={null}>
        <Spacing
          host={spacingHost}
          selection={props.selection}
          zoom={pz.zoom}
        />
      </Suspense>
    ),
    [Spacing, spacingHost, props.selection, pz.zoom]
  );

  const comments = useMemo(
    () => (
      <CanvasComments
        comment={comment}
        draw={draw}
        control={props.comments}
        frames={frames}
        kind={props.kind}
        zoom={pz.zoom}
        frame={viewport}
        selectMode={pane.picking}
        editing={inEditPane(props.shell)}
        selection={props.selection}
        tools={commentToolsOf(props, active.path)}
        activeFrame={activeFrameOf(active, layout.frames)}
      />
    ),
    [
      comment,
      draw,
      frames,
      pz.zoom,
      viewport,
      pane.picking,
      props,
      active,
      layout.frames,
    ]
  );

  return (
    <>
      <LiveOverlay
        hover={frames.hover}
        picked={frames.picked}
        commenting={stage.commentMode}
        picking={stage.picking || stage.commentMode}
        selection={props.selection}
        zoom={pz.zoom}
        resize={resize}
        spacing={spacing}
        comments={comments}
      />
      <Suspense fallback={null}>
        <Grid
          host={spacingHost}
          selection={props.selection}
          variant={variant}
          zoom={pz.zoom}
        />
      </Suspense>
    </>
  );
};

export { StageOverlay };
