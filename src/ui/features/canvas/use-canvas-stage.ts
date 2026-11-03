import { useRef, useState } from "react";

import { useUi } from "../../platform/storage.js";
import { useFirstBuildGate } from "../chat/use-first-build.js";
import { useCommentMode } from "../comments/use-comment-mode.js";
import { boundsOf, shownFrames } from "./canvas-frames-model.js";
import {
  activateOf,
  knownIds,
  knownList,
  livePageUrl,
  noteCommentFrame,
  stageNote,
} from "./canvas-helpers.js";
import { useShellPane } from "./canvas-shell.js";
import type { ViewProps } from "./canvas-types.js";
import { markOf, withElementMark } from "./element-mark-model.js";
import { useFrameStates } from "./frame-states-model.js";
import { useResetPassiveGateInFirstRender } from "./passive-frame.js";
import {
  unionRect,
  useCanvasFrames,
  useZoomInput,
} from "./use-canvas-frames.js";
import { useCanvasDraw } from "./use-draw-tool.js";
import { usePanZoom } from "./use-pan-zoom.js";
import { usePreviewUrl, useRenderCheck } from "./use-preview-url.js";

const useCanvasStage = (props: ViewProps) => {
  const { projectId, directionId, kind, source, headVersionId } = props;
  const ui = useUi();
  useResetPassiveGateInFirstRender();
  const stageRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);

  const canvasFrames = useCanvasFrames(
    projectId,
    directionId,
    activateOf(props.directions),
    knownIds(props.directions)
  );

  const { layout, active } = canvasFrames;
  const shown = shownFrames(layout);
  const viewport = { width: active.width, height: active.height };
  const selectionRef = useRef(props.selection);
  selectionRef.current = props.selection;

  const pz = usePanZoom({
    stageRef,
    artboardRef,
    layout: { activeId: active.id, active, bounds: boundsOf(shown) },
    setting: ui.zoom,
    selectionRect: () => unionRect(selectionRef.current),
  });

  const zoomBy = useZoomInput(pz.applyZoomKey);
  const [selectMode, setSelectMode] = useState(false);
  const check = useRenderCheck(projectId, directionId);

  const comment = useCommentMode(
    props.comments,
    source.kind === "live",
    setSelectMode
  );

  noteCommentFrame(props.comments, active);
  const commentMode = comment.on;
  const live = source.kind === "live";

  const pane = useShellPane(
    props.shell,
    comment,
    selectMode,
    setSelectMode,
    live,
    ui.layersOpen
  );

  const [protoOn, setProtoOn] = useState(false);
  const { layersOpen, toggleEdit } = pane;
  const picking = pane.picking || protoOn;

  const setProto = (next: boolean) => {
    setProtoOn(next);

    if (!next) {
      return;
    }

    comment.setOn(false);
    setSelectMode(() => false);

    if (props.shell?.pane === "design") {
      void props.shell.onPane("chat");
    }
  };

  const draw = useCanvasDraw(comment, picking, setSelectMode);

  const preview = usePreviewUrl(projectId, directionId, source, headVersionId);
  const urlError = preview.urlError;

  const baseUrl = withElementMark(
    preview.baseUrl,
    markOf(knownList(props.directions), directionId)
  );

  const frameStates = useFrameStates(projectId, Boolean(props.app));
  const liveUrl = livePageUrl(baseUrl, active, frameStates);

  const note = stageNote({
    running: props.running,
    noRuns: props.noRuns,
    app: props.app,
    live,
    hasHead: headVersionId !== null,
    urlError,
  });

  const firstBuild = useFirstBuildGate({
    projectId,
    directionId,
    kind,
    live,
    running: props.running,
    hasHead: headVersionId !== null,
    urlError,
    lastChange: props.lastChange,
    path: active.path,
    emptyStage: note === "empty",
    url: liveUrl,
  });

  return {
    ui,
    stageRef,
    artboardRef,
    canvasFrames,
    layout,
    active,
    shown,
    viewport,
    pz,
    zoomBy,
    selectMode,
    setSelectMode,
    check,
    comment,
    commentMode,
    live,
    pane,
    protoOn,
    setProtoOn,
    layersOpen,
    toggleEdit,
    picking,
    setProto,
    draw,
    urlError,
    baseUrl,
    frameStates,
    liveUrl,
    note,
    firstBuild,
  };
};

export { useCanvasStage };
