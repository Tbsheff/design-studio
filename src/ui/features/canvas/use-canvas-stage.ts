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
  const viewport = { height: active.height, width: active.width };
  const selectionRef = useRef(props.selection);
  selectionRef.current = props.selection;

  const pz = usePanZoom({
    artboardRef,
    layout: { active, activeId: active.id, bounds: boundsOf(shown) },
    selectionRect: () => unionRect(selectionRef.current),
    setting: ui.zoom,
    stageRef,
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
  const { urlError } = preview;

  const baseUrl = withElementMark(
    preview.baseUrl,
    markOf(knownList(props.directions), directionId)
  );

  const frameStates = useFrameStates(projectId, Boolean(props.app));
  const liveUrl = livePageUrl(baseUrl, active, frameStates);

  const note = stageNote({
    app: props.app,
    hasHead: headVersionId !== null,
    live,
    noRuns: props.noRuns,
    running: props.running,
    urlError,
  });

  const firstBuild = useFirstBuildGate({
    directionId,
    emptyStage: note === "empty",
    hasHead: headVersionId !== null,
    kind,
    lastChange: props.lastChange,
    live,
    path: active.path,
    projectId,
    running: props.running,
    url: liveUrl,
    urlError,
  });

  return {
    active,
    artboardRef,
    baseUrl,
    canvasFrames,
    check,
    comment,
    commentMode,
    draw,
    firstBuild,
    frameStates,
    layersOpen,
    layout,
    live,
    liveUrl,
    note,
    pane,
    picking,
    protoOn,
    pz,
    selectMode,
    setProto,
    setProtoOn,
    setSelectMode,
    shown,
    stageRef,
    toggleEdit,
    ui,
    urlError,
    viewport,
    zoomBy,
  };
};

export { useCanvasStage };
