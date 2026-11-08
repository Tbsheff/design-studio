import type { ReactElement } from "react";
import { Suspense, useCallback, useMemo } from "react";

import { AnimationEntry } from "../animation/index.js";
import { ImportPageSlot, importPageItems } from "../page-import/index.js";
import { ReviewEntry } from "../review/review-entry.js";
import { ScenarioSection } from "../scenario/index.js";
import { FindPanelSlot, useFindHost } from "../text-search/index.js";
import { MatrixSlot } from "../viewport/index.js";
import type { ChromeImportPage } from "./canvas-chrome-menu.js";
import { CanvasChrome } from "./canvas-chrome.js";
import { frameDirection, frameName } from "./canvas-frames-model.js";
import {
  canvasClass,
  frameLabelOf,
  hostedClose,
  jumpToFrame,
} from "./canvas-helpers.js";
import { CanvasLayersPanel } from "./canvas-layers.js";
import { CanvasStage } from "./canvas-stage.js";
import type { ViewProps } from "./canvas-types.js";
import { FrameStateSlotContext } from "./frame-state-slot-context.js";
import type { FrameStateSlotArgs } from "./frame-state-slot-context.js";
import { CheckResults } from "./stage-parts.js";
import { useCanvasEdits } from "./use-canvas-edits.js";
import { useCanvasPreview } from "./use-canvas-preview.js";
import { useCanvasStage } from "./use-canvas-stage.js";
import { useCanvasWiring } from "./use-canvas-wiring.js";

const renderScenarioSlot = (args: FrameStateSlotArgs): ReactElement => (
  <ScenarioSection
    projectId={args.projectId}
    directionId={args.directionId}
    frameId={args.frameId}
  />
);

const useViewSlots = (
  props: ViewProps,
  text: ReturnType<typeof useCanvasStage>,
  pv: ReturnType<typeof useCanvasPreview>
) => {
  const { projectId, directionId } = props;
  const { active, canvasFrames, pz } = text;

  const findHost = useFindHost({
    enabled: directionId !== null,
    frames: canvasFrames,
    post: pv.frames.post,
  });

  const matrixSlot = useMemo(
    () => (
      <Suspense fallback={null}>
        <MatrixSlot
          projectId={projectId}
          directionId={directionId}
          frame={active}
          frameLabelOf={frameLabelOf}
          onJumpToFrame={jumpToFrame}
        />
      </Suspense>
    ),
    [active, directionId, projectId]
  );

  const renderImport = useCallback(
    (onClose: () => void) => {
      if (directionId === null) {
        return null;
      }

      return (
        <ImportPageSlot
          projectId={projectId}
          directionId={directionId}
          frames={canvasFrames}
          zoom={pz}
          onClose={onClose}
        />
      );
    },
    [canvasFrames, directionId, projectId, pz]
  );

  const importPage = useMemo<ChromeImportPage>(
    () => ({ items: importPageItems, render: renderImport }),
    [renderImport]
  );

  return { findHost, importPage, matrixSlot };
};

const CanvasView = (props: ViewProps): ReactElement => {
  const textValue = useCanvasStage(props);
  const pv = useCanvasPreview(props, textValue);
  const ed = useCanvasEdits(props, textValue, pv);
  const width = useCanvasWiring(props, textValue, pv, ed);

  const { findHost, importPage, matrixSlot } = useViewSlots(
    props,
    textValue,
    pv
  );

  const CommandsHost = props.commandsHost;
  const { projectId, directionId, kind, source, headVersionId } = props;

  const {
    ui,
    stageRef,
    canvasFrames,
    layout,
    active,
    pz,
    selectMode,
    setSelectMode,
    check,
    comment,
    live,
    pane,
    protoOn,
    layersOpen,
    toggleEdit,
    setProto,
    draw,
    liveUrl,
  } = textValue;

  const { inline, frames } = pv;
  const { layerEdits, previewMenu } = ed;

  const {
    darkSwitch,
    lofiSwitch,
    sandbox,
    addFrameAt,
    labelProps,
    proto,
    commandsInput,
    appCanvas,
  } = width;

  return (
    <div className={canvasClass(inline.editing)}>
      <CanvasChrome
        matrix={matrixSlot}
        importPage={importPage}
        shell={props.shell}
        kind={kind}
        projectId={projectId}
        directionId={directionId}
        live={live}
        ui={ui}
        zoom={pz}
        comment={comment}
        selectMode={selectMode}
        setSelectMode={setSelectMode}
        toggleEdit={toggleEdit}
        layout={layout}
        active={active}
        frames={canvasFrames}
        label={(canvasFrame) =>
          labelProps(canvasFrame, frameDirection(canvasFrame, directionId))
        }
        addFrame={addFrameAt}
        presentUrl={liveUrl}
        sandbox={sandbox}
        selection={props.selection}
        stage={() => stageRef.current}
        view={{
          checking: check.checking,
          drawMode: draw.toolbarMode,
          hasHead: headVersionId !== null,
          links: proto.viewToggle,
          lofi: lofiSwitch,
          onCheck: check.run,
          onSource: props.onSource,
          onToggleDraw: draw.toggle,
          source,
          theme: darkSwitch,
        }}
        proto={{ on: protoOn, play: proto.play, set: setProto }}
      />
      {appCanvas.bar}
      <CheckResults projectId={projectId} check={check} />
      <FindPanelSlot
        projectId={projectId}
        directionId={directionId}
        host={findHost}
      />
      <ReviewEntry
        projectId={projectId}
        directionId={directionId}
        frame={active}
        live={live}
        running={props.running}
        lastChange={props.lastChange}
        post={frames.post}
        shell={props.shell}
        toolKey={`${protoOn}-${comment.on}-${layersOpen}`}
      />
      {directionId !== null && (
        <Suspense fallback={null}>
          <AnimationEntry
            directionId={directionId}
            post={frames.post}
            projectId={projectId}
            selector={props.selection[0]?.selector ?? null}
          />
        </Suspense>
      )}
      {previewMenu.menu}
      {CommandsHost && <CommandsHost {...commandsInput} />}
      <div className="canvas-body">
        {layersOpen &&
          pane.place(
            <CanvasLayersPanel
              frames={frames}
              edits={layerEdits}
              frameName={frameName(active)}
              selection={props.selection}
              onSelectMode={() => setSelectMode(true)}
              onClose={hostedClose(props.shell, pane.closeLayers)}
            />
          )}
        <FrameStateSlotContext.Provider value={renderScenarioSlot}>
          <CanvasStage props={props} s={textValue} pv={pv} ed={ed} w={width} />
        </FrameStateSlotContext.Provider>
      </div>
    </div>
  );
};

export { CanvasView };
