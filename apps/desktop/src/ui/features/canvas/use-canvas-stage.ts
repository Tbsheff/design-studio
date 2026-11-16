import { useLayoutEffect, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import { heldTool } from "../../platform/canvas-tool.js";
import { useLive } from "../../platform/live-store.js";
import { useUi } from "../../platform/storage.js";
import { useFirstBuildGate } from "../chat/use-first-build.js";
import { useCommentMode } from "../comments/use-comment-mode.js";
import { boundsOf, shownFrames } from "./canvas-frame-ops.js";
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
import { useResetPassiveGateInFirstRender } from "./passive-mount.js";
import { unionRect, useCanvasFrames } from "./use-canvas-frames.js";
import { useCanvasDraw } from "./use-draw-tool.js";
import { useFrameZoom } from "./use-frame-zoom.js";
import { usePanZoom } from "./use-pan-zoom.js";
import { usePreviewUrl, useRenderCheck } from "./use-preview-url.js";
import { useZoomInput } from "./use-zoom-input.js";

type CanvasFramesState = ReturnType<typeof useCanvasFrames>;

type ShellPane = ReturnType<typeof useShellPane>;

type CommentMode = ReturnType<typeof useCommentMode>;

type StageSetter = Dispatch<SetStateAction<boolean>>;

interface StageViewport {
  readonly active: CanvasFramesState["active"];
  readonly artboardRef: RefObject<HTMLDivElement | null>;
  readonly canvasFrames: CanvasFramesState;
  readonly layout: CanvasFramesState["layout"];
  readonly pz: ReturnType<typeof usePanZoom>;
  readonly shown: ReturnType<typeof shownFrames>;
  readonly stageRef: RefObject<HTMLDivElement | null>;
  readonly ui: ReturnType<typeof useUi>;
  readonly viewport: { readonly height: number; readonly width: number };
  readonly zoomBy: ReturnType<typeof useZoomInput>;
}

interface StageModes {
  readonly comment: CommentMode;
  readonly commentMode: boolean;
  readonly draw: ReturnType<typeof useCanvasDraw>;
  readonly layersOpen: ShellPane["layersOpen"];
  readonly live: boolean;
  readonly pane: ShellPane;
  readonly picking: boolean;
  readonly protoOn: boolean;
  readonly selectMode: boolean;
  readonly setProto: (next: boolean) => void;
  readonly setProtoOn: StageSetter;
  readonly setSelectMode: StageSetter;
  readonly toggleEdit: ShellPane["toggleEdit"];
}

interface CanvasStage extends StageViewport, StageModes {
  readonly baseUrl: ReturnType<typeof withElementMark>;
  readonly check: ReturnType<typeof useRenderCheck>;
  readonly firstBuild: ReturnType<typeof useFirstBuildGate>;
  readonly frameStates: ReturnType<typeof useFrameStates>;
  readonly liveUrl: ReturnType<typeof livePageUrl>;
  readonly note: ReturnType<typeof stageNote>;
  readonly urlError: ReturnType<typeof usePreviewUrl>["urlError"];
}

interface PanZoomInput {
  readonly active: CanvasFramesState["active"];
  readonly shown: ReturnType<typeof shownFrames>;
  readonly ui: ReturnType<typeof useUi>;
}

const toPanZoomLayout = ({
  active,
  shown,
  ui,
}: PanZoomInput): Pick<
  Parameters<typeof usePanZoom>[0],
  "layout" | "setting"
> => {
  const layout = { active, activeId: active.id, bounds: boundsOf(shown) };
  const setting = ui.zoom;

  return { layout, setting };
};

const useStageViewport = (props: ViewProps): StageViewport => {
  const { projectId, directionId } = props;
  const ui = useUi();
  useResetPassiveGateInFirstRender();
  const stageRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);

  const canvasFrames = useCanvasFrames(
    projectId,
    directionId,
    activateOf(props.directions) ?? null,
    knownIds(props.directions) ?? null
  );

  const { layout, active } = canvasFrames;
  const shown = shownFrames(layout);
  const viewport = { height: active.height, width: active.width };
  const selectionRef = useRef(props.selection);
  useLayoutEffect(() => {
    selectionRef.current = props.selection;
  });

  const selectionRect = (): ReturnType<typeof unionRect> =>
    unionRect(selectionRef.current);

  const pz = usePanZoom({
    ...toPanZoomLayout({ active, shown, ui }),
    artboardRef,
    isInspectorOpen: props.shell?.isInspectorOpen ?? false,
    selectionRect,
    stageRef,
  });

  const zoomBy = useZoomInput(pz.applyZoomKey);

  useFrameZoom({ active, layout, projectId, zoomToBox: pz.zoomToBox });

  return {
    active,
    artboardRef,
    canvasFrames,
    layout,
    pz,
    shown,
    stageRef,
    ui,
    viewport,
    zoomBy,
  };
};

const useStageModes = (props: ViewProps, view: StageViewport): StageModes => {
  const { active, ui } = view;
  const [selectMode, setSelectMode] = useState(true);

  const comment = useCommentMode(
    props.comments,
    props.source.kind === "live",
    setSelectMode
  );

  noteCommentFrame(props.comments, active);
  const commentMode = comment.on;
  const live = props.source.kind === "live";

  const held = useLive(heldTool);

  const pane = useShellPane(props.shell, comment, {
    isPlacing: held === "frame" || held === "text",
    layersOpenSetting: ui.layersOpen,
    live,
    selectMode,
  });

  const [protoOn, setProtoOn] = useState(false);
  const { layersOpen, toggleEdit } = pane;
  const picking = pane.picking || protoOn;

  const setProto = (next: boolean): void => {
    setProtoOn(next);

    if (!next) {
      return;
    }

    comment.setOn(false);
    setSelectMode(() => false);
  };

  const draw = useCanvasDraw(comment, picking, setSelectMode);

  return {
    comment,
    commentMode,
    draw,
    layersOpen,
    live,
    pane,
    picking,
    protoOn,
    selectMode,
    setProto,
    setProtoOn,
    setSelectMode,
    toggleEdit,
  };
};

const useCanvasStage = (props: ViewProps): CanvasStage => {
  const { projectId, directionId, kind, source, headVersionId } = props;
  const view = useStageViewport(props);
  const { active } = view;
  const check = useRenderCheck(projectId, directionId);
  const modes = useStageModes(props, view);
  const { live } = modes;
  const preview = usePreviewUrl(projectId, directionId, source, headVersionId);
  const { urlError } = preview;

  const baseUrl = withElementMark(
    preview.baseUrl,
    markOf(knownList(props.directions), directionId)
  );

  const frameStates = useFrameStates(projectId, Boolean(props.app));
  const liveUrl = livePageUrl(baseUrl, active, frameStates);

  const { app, noRuns, running } = props;
  const hasHead = headVersionId !== null;
  const note = stageNote({ app, hasHead, live, noRuns, running, urlError });

  const emptyStage = note === "empty";
  const { lastChange } = props;
  const { path } = active;
  const url = liveUrl;

  const firstBuild = useFirstBuildGate({
    directionId,
    emptyStage,
    hasHead,
    kind,
    lastChange,
    live,
    path,
    projectId,
    running,
    url,
    urlError,
  });

  return {
    ...view,
    ...modes,
    baseUrl,
    check,
    firstBuild,
    frameStates,
    liveUrl,
    note,
    urlError,
  };
};

export { useCanvasStage };
