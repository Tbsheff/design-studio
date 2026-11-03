import { Suspense, useCallback, useMemo } from "react";

import { ImportPageSlot, importPageItems } from "../page-import/index.js";
import { ReviewEntry } from "../review/review-entry.js";
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
import { CheckResults } from "./stage-parts.js";
import { useCanvasEdits } from "./use-canvas-edits.js";
import { useCanvasPreview } from "./use-canvas-preview.js";
import { useCanvasStage } from "./use-canvas-stage.js";
import { useCanvasWiring } from "./use-canvas-wiring.js";

const useViewSlots = (
  props: ViewProps,
  s: ReturnType<typeof useCanvasStage>,
  pv: ReturnType<typeof useCanvasPreview>
) => {
  const { projectId, directionId } = props;
  const { active, canvasFrames, pz } = s;

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

const CanvasView = (props: ViewProps) => {
  const s = useCanvasStage(props);
  const pv = useCanvasPreview(props, s);
  const ed = useCanvasEdits(props, s, pv);
  const w = useCanvasWiring(props, s, pv, ed);
  const { findHost, importPage, matrixSlot } = useViewSlots(props, s, pv);
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
  } = s;
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
  } = w;

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
        label={(f) => labelProps(f, frameDirection(f, directionId))}
        addFrame={addFrameAt}
        presentUrl={liveUrl}
        sandbox={sandbox}
        selection={props.selection}
        stage={() => stageRef.current}
        view={{
          drawMode: draw.toolbarMode,
          onToggleDraw: draw.toggle,
          source,
          onSource: props.onSource,
          hasHead: headVersionId !== null,
          checking: check.checking,
          onCheck: check.run,
          theme: darkSwitch,
          lofi: lofiSwitch,
          links: proto.viewToggle,
        }}
        proto={{ on: protoOn, set: setProto, play: proto.play }}
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
        <CanvasStage props={props} s={s} pv={pv} ed={ed} w={w} />
      </div>
    </div>
  );
};

export { CanvasView };
