import { Suspense, lazy, useCallback } from "react";
import type { ReactElement } from "react";

import { McpPointBadge } from "../chat/index.js";
import { CommentModePill } from "../comments/comment-layer.js";
import { useEditVariant } from "../inspector/index.js";
import { AgentPresenceLine } from "./agent-presence-line.js";
import { frameName } from "./canvas-frame-ops.js";
import { dropQuietFocus, quietOnPointer } from "./canvas-helpers.js";
import type { CanvasStageProps } from "./canvas-stage-types.js";
import { copy } from "./copy.js";
import { DrawBar } from "./draw-bar.js";
import { EditNotice } from "./edit-notice.js";
import { FrameUndoBar } from "./frame-undo-bar.js";
import { StageArtboard } from "./stage-artboard.js";
import { StageMessage } from "./stage-message.js";
import { StageRulers } from "./stage-rulers.js";
import { unionRect } from "./use-canvas-frames.js";

const LazySpacingHandles = lazy(async () => {
  const loaded = await import("../spacing/index.js");

  return { default: loaded.SpacingHandles };
});

const LazyGridOverlay = lazy(async () => {
  const loaded = await import("../grid/index.js");

  return { default: loaded.GridOverlay };
});

const LazyTabOrderSlot = lazy(async () => {
  const loaded = await import("../accessibility/index.js");

  return { default: loaded.TabOrderSlot };
});

const STAGE_SLOTS = {
  Grid: LazyGridOverlay,
  Spacing: LazySpacingHandles,
  TabOrder: LazyTabOrderSlot,
} as const;

const toPanningClass = (isPanning: boolean): string => {
  if (isPanning) {
    return " panning";
  }

  return "";
};

const CanvasStage = (stageProps: CanvasStageProps): ReactElement => {
  const { edits, preview, props, stage, wiring } = stageProps;
  const variant = useEditVariant();
  const { active, artboardRef, canvasFrames, comment, draw, note } = stage;
  const { pz, stageRef, ui } = stage;
  const { dismissUndo, undoRemove } = wiring;
  const { layerEdits, pointBadge, presence } = edits;
  const { layout } = canvasFrames;

  const nameOf = useCallback(
    (id: string): string => {
      const found = layout.frames.find((item) => item.id === id);

      if (found) {
        return frameName(found);
      }

      return id;
    },
    [layout.frames]
  );

  return (
    <div
      role="toolbar"
      ref={stageRef}
      className={`stage ${wiring.stageMode}${toPanningClass(pz.panning)}`}
      tabIndex={-1}
      aria-label={copy.canvas}
      onPointerDown={quietOnPointer(pz.onPointerDown)}
      onBlur={dropQuietFocus}
    >
      <StageMessage
        note={note}
        covered={preview.covered}
        urlError={stage.urlError}
        app={wiring.appCanvas.stage}
      />
      <StageArtboard
        slots={STAGE_SLOTS}
        variant={variant}
        props={props}
        stage={stage}
        preview={preview}
        edits={edits}
        wiring={wiring}
      />
      {wiring.proto.stage}
      {ui.rulers && (
        <StageRulers
          artboardRef={artboardRef}
          origin={active}
          selection={unionRect(props.selection)}
        />
      )}
      <DrawBar draw={draw} />
      <CommentModePill mode={comment} control={props.comments} />
      {wiring.capture && <div className="capture" data-testid="pan-capture" />}
      <FrameUndoBar onUndo={undoRemove} onDismiss={dismissUndo} />
      <EditNotice edits={layerEdits} />
      <Suspense fallback={null}>
        <McpPointBadge badge={pointBadge} frameName={nameOf} />
      </Suspense>
      <AgentPresenceLine frames={layout.frames} presence={presence} />
    </div>
  );
};

export { CanvasStage };
