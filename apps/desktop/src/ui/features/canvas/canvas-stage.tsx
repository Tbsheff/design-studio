import type { ReactElement } from "react";
import { Suspense, lazy } from "react";

import { TabOrderSlot } from "../accessibility/index.js";
import { McpPointBadge } from "../chat/index.js";
import { CommentModePill } from "../comments/comment-layer.js";
import type { GridOverlayProps } from "../grid/index.js";
import { useEditVariant } from "../inspector/index.js";
import type { SpacingHandlesProps } from "../spacing/index.js";
import { FrameUndoBar } from "./add-frame-menu.js";
import { frameDirection, frameName } from "./canvas-frames-model.js";
import { FrameLabel } from "./canvas-frames.js";
import {
  activeFrameOf,
  commentToolsOf,
  dropQuietFocus,
  inEditPane,
  quietOnPointer,
} from "./canvas-helpers.js";
import { EditNotice } from "./canvas-layers.js";
import { FrameSnapLayer, MarqueeLayer } from "./canvas-overlays.js";
import {
  CanvasComments,
  InlinePromptSlot,
  VectorSlot,
} from "./canvas-tool-slots.js";
import type { ViewProps } from "./canvas-types.js";
import { copy } from "./copy.js";
import { DrawBar } from "./draw-layer.js";
import { FrameResizeHandles } from "./frame-resize-handles.js";
import {
  FreeMoveSlot,
  LiveOverlay,
  OtherFrames,
  PreviewSlots,
  StageMessage,
  StepCover,
} from "./stage-parts.js";
import type { useCanvasEdits } from "./use-canvas-edits.js";
import { unionRect } from "./use-canvas-frames.js";
import type { useCanvasPreview } from "./use-canvas-preview.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import type { useCanvasWiring } from "./use-canvas-wiring.js";

const CanvasRulers = lazy(() => import("./canvas-rulers.js"));

const LazySpacingHandles = lazy(async () => {
  const loaded = await import("../spacing/index.js");

  return { default: loaded.SpacingHandles };
});

const SpacingLayer = ({
  host,
  selection,
  zoom,
}: SpacingHandlesProps): ReactElement => (
  <Suspense fallback={null}>
    <LazySpacingHandles host={host} selection={selection} zoom={zoom} />
  </Suspense>
);

const LazyGridOverlay = lazy(async () => {
  const loaded = await import("../grid/index.js");

  return { default: loaded.GridOverlay };
});

const GridLayer = ({
  host,
  selection,
  variant,
  zoom,
}: GridOverlayProps): ReactElement => (
  <Suspense fallback={null}>
    <LazyGridOverlay
      host={host}
      selection={selection}
      variant={variant}
      zoom={zoom}
    />
  </Suspense>
);

interface CanvasStageProps {
  props: ViewProps;
  s: ReturnType<typeof useCanvasStage>;
  pv: ReturnType<typeof useCanvasPreview>;
  ed: ReturnType<typeof useCanvasEdits>;
  w: ReturnType<typeof useCanvasWiring>;
}

const CanvasStage = ({
  props,
  s: text,
  pv,
  ed,
  w: widthValue,
}: CanvasStageProps): ReactElement => {
  const editVariant = useEditVariant();

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
  } = text;

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
  } = widthValue;

  let part: "" | " panning" = "";

  if (pz.panning) {
    part = " panning";
  }

  const visibility2: "hidden" | undefined = ((): "hidden" | undefined => {
    if (note !== "empty") {
      return undefined;
    }
    return "hidden";
  })();

  return (
    <div
      ref={stageRef}
      className={`stage ${stageMode}${part}`}
      tabIndex={-1}
      aria-label={copy.canvas}
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
          height: viewport.height,
          visibility: visibility2,
          width: viewport.width,
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
        <GridLayer
          host={spacingHost}
          selection={props.selection}
          variant={editVariant}
          zoom={pz.zoom}
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
          onPointerDown={(event, edge) => onResizeStart(event, active, edge)}
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
      <Suspense fallback={null}>
        <McpPointBadge
          badge={pointBadge}
          frameName={(id: string) => {
            const frameValue = canvasFrames.layout.frames.find(
              (item) => item.id === id
            );

            if (frameValue) {
              return frameName(frameValue);
            }
            return id;
          }}
        />
      </Suspense>
    </div>
  );
};

export { CanvasStage };
