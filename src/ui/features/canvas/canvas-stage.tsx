import { Suspense, lazy } from "react";

import { McpPointBadge, TabOrderSlot } from "../../canvas-slots.js";
import { frameDirection, frameName } from "../../canvasFrames.js";
import { FrameLabel, FrameUndoBar } from "../../components/CanvasFrames.js";
import { CommentModePill } from "../../components/CommentLayer.js";
import { DrawBar } from "../../components/DrawLayer.js";
import { FrameResizeHandles } from "../../components/FrameControls.js";
import { unionRect } from "../../useCanvasFrames.js";
import {
  activeFrameOf,
  commentToolsOf,
  dropQuietFocus,
  inEditPane,
  quietOnPointer,
} from "./canvas-helpers.js";
import { EditNotice } from "./canvas-layers.js";
import {
  FrameSnapLayer,
  MarqueeLayer,
  SpacingLayer,
} from "./canvas-overlays.js";
import {
  CanvasComments,
  InlinePromptSlot,
  VectorSlot,
} from "./canvas-tool-slots.js";
import type { ViewProps } from "./canvas-types.js";
import {
  FreeMoveSlot,
  LiveOverlay,
  OtherFrames,
  PreviewSlots,
  StageMessage,
  StepCover,
} from "./stage-parts.js";
import type { useCanvasEdits } from "./use-canvas-edits.js";
import type { useCanvasPreview } from "./use-canvas-preview.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import type { useCanvasWiring } from "./use-canvas-wiring.js";

const CanvasRulers = lazy(() => import("../../components/CanvasRulers.js"));

interface CanvasStageProps {
  props: ViewProps;
  s: ReturnType<typeof useCanvasStage>;
  pv: ReturnType<typeof useCanvasPreview>;
  ed: ReturnType<typeof useCanvasEdits>;
  w: ReturnType<typeof useCanvasWiring>;
}

const CanvasStage = ({ props, s, pv, ed, w }: CanvasStageProps) => {
  const { projectId, directionId, kind } = props;
  const {
    ui,
    stageRef,
    artboardRef,
    canvasFrames,
    layout,
    active,
    shown,
    viewport,
    pz,
    comment,
    commentMode,
    pane,
    protoOn,
    picking,
    draw,
    urlError,
    note,
    firstBuild,
  } = s;
  const { frames, covered, passive } = pv;
  const {
    layerEdits,
    inlinePrompt,
    resize,
    spacingHost,
    freeMove,
    pointBadge,
  } = ed;
  const {
    sandbox,
    registerPassive,
    undoRemove,
    dismissUndo,
    onResizeStart,
    labelProps,
    proto,
    appCanvas,
    capture,
    stageMode,
  } = w;

  return (
    <div
      ref={stageRef}
      className={`stage ${stageMode}${pz.panning ? " panning" : ""}`}
      tabIndex={-1}
      aria-label="Canvas"
      onPointerDown={quietOnPointer(pz.onPointerDown)}
      onBlur={dropQuietFocus}
    >
      <StageMessage
        note={note}
        covered={covered}
        urlError={urlError}
        app={appCanvas.stage}
      />
      <div
        ref={artboardRef}
        className="artboard"
        data-frame-id={active.id}
        data-direction-id={directionId || undefined}
        style={{
          width: viewport.width,
          height: viewport.height,
          visibility: note === "empty" ? "hidden" : undefined,
        }}
      >
        <PreviewSlots frames={frames} sandbox={sandbox} viewport={viewport} />
        <StepCover
          steps={props.steps}
          covered={covered}
          wait={firstBuild.wait}
          path={active.path}
        />
        <TabOrderSlot
          projectId={projectId}
          directionId={directionId}
          frameId={active.id}
          frames={frames}
          kind={kind}
          isBlocked={protoOn}
          lastChange={props.lastChange}
          zoom={pz.zoom}
        />
        <LiveOverlay
          hover={frames.hover}
          picked={frames.picked}
          commenting={commentMode}
          picking={picking || commentMode}
          selection={props.selection}
          zoom={pz.zoom}
          resize={resize}
          spacing={
            <SpacingLayer
              host={spacingHost}
              selection={props.selection}
              zoom={pz.zoom}
            />
          }
          comments={
            <CanvasComments
              comment={comment}
              draw={draw}
              control={props.comments}
              frames={frames}
              kind={kind}
              zoom={pz.zoom}
              frame={viewport}
              selectMode={pane.picking}
              editing={inEditPane(props.shell)}
              selection={props.selection}
              tools={commentToolsOf(props, active.path)}
              activeFrame={activeFrameOf(active, layout.frames)}
            />
          }
        />
        <InlinePromptSlot view={inlinePrompt} zoom={pz.zoom} frame={viewport} />
        <MarqueeLayer listen={frames.listen} />
        <VectorSlot
          projectId={projectId}
          directionId={directionId}
          zoom={pz.zoom}
          frame={viewport}
          post={frames.post}
          listen={frames.listen}
          notify={layerEdits.notify}
          page={active.path}
        />
        <FreeMoveSlot view={freeMove} />
        <FrameLabel
          {...labelProps(active, frameDirection(active, directionId))}
          note={appCanvas.note}
        />
        <FrameResizeHandles
          onPointerDown={(e, edge) => onResizeStart(e, active, edge)}
        />
        <OtherFrames
          frames={shown}
          active={active}
          passive={passive}
          sandbox={sandbox}
          labelProps={labelProps}
          register={registerPassive}
          waiting={firstBuild.waitFor}
          steps={props.steps}
        />
        <FrameSnapLayer origin={active} />
        {proto.artboard}
      </div>
      {proto.stage}
      {ui.rulers && (
        <Suspense fallback={null}>
          <CanvasRulers
            artboardRef={artboardRef}
            origin={active}
            selection={unionRect(props.selection)}
          />
        </Suspense>
      )}
      <DrawBar draw={draw} />
      <CommentModePill mode={comment} control={props.comments} />
      {capture && <div className="capture" data-testid="pan-capture" />}
      <FrameUndoBar onUndo={undoRemove} onDismiss={dismissUndo} />
      <EditNotice edits={layerEdits} />
      <McpPointBadge
        badge={pointBadge}
        frameName={(id) => {
          const f = canvasFrames.layout.frames.find((item) => item.id === id);

          return f ? frameName(f) : id;
        }}
      />
    </div>
  );
};

export { CanvasStage };
