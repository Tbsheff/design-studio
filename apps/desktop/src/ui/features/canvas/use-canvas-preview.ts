import type { ZoomKey } from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

import { useFirstBuildCover } from "../chat/use-first-build.js";
import {
  setCanvasFront,
  useCanvasTheme,
  useTokenFrames,
} from "../design-system/token-frames.js";
import { usePlannedEdits } from "../inspector/use-planned-edits.js";
import { knownList, marqueeAllowed } from "./canvas-helpers.js";
import type { ViewProps } from "./canvas-types.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import { useDirectionFrames } from "./use-direction-frames.js";
import { useInlineTextEdit, useResetOnChange } from "./use-inline-text-edit.js";
import { useLayersWatch, useSelectMoveKeys } from "./use-layers-watch.js";
import { usePreviewFrames } from "./use-preview-frames.js";
import { useFramePort } from "./use-preview-url.js";
import { useStageKeys } from "./use-stage-keys.js";

type CanvasStageState = ReturnType<typeof useCanvasStage>;

type PreviewFrames = ReturnType<typeof usePreviewFrames>;

interface MenuPoint {
  readonly x: number;
  readonly y: number;
}

type MenuOpener = MutableRefObject<(at: MenuPoint) => void>;

interface PreviewState {
  readonly covered: ReturnType<typeof useFirstBuildCover>;
  readonly frames: PreviewFrames;
  readonly inline: ReturnType<typeof useInlineTextEdit>;
  readonly stageEl: () => HTMLDivElement | null;
}

interface CanvasPreview extends PreviewState {
  readonly editsEnabled: boolean;
  readonly openMenu: MenuOpener;
  readonly passive: ReturnType<typeof useDirectionFrames>;
  readonly theme: ReturnType<typeof useCanvasTheme>;
}

const toLiveFrames = (
  live: boolean,
  frames: PreviewFrames
): PreviewFrames | null => {
  if (live) {
    return frames;
  }

  return null;
};

const usePreviewState = (
  props: ViewProps,
  text: CanvasStageState,
  openMenu: MenuOpener
): PreviewState => {
  const { projectId, directionId, kind, lastChange, selection } = props;
  const { stageRef, pane, pz, zoomBy, setSelectMode, setProtoOn } = text;
  const { comment, commentMode, live, picking, protoOn, firstBuild } = text;
  const textEditAllowed = live && !props.running && !commentMode;

  const resetPreview = (): void => {
    props.port?.current?.post({ type: "preview-reset" });
  };

  const stageEl = useCallback(() => stageRef.current, [stageRef]);

  const inline = useInlineTextEdit(
    textEditAllowed,
    props.onTextCommit,
    resetPreview,
    stageEl
  );

  const baseUrl = firstBuild.url;
  const marquee = marqueeAllowed(pane.picking, protoOn, commentMode);
  const onContextMenu = (at: MenuPoint): void => openMenu.current(at);
  const { onError } = props;
  const onFrameWheel = pz.frameWheel;

  const onModeExited = (): void => {
    setSelectMode(true);
    setProtoOn(false);
    comment.setOn(false);
  };

  const onTextEdit = inline.onMessage;
  const onZoomKey = (key: ZoomKey): void => zoomBy(key, "frame");
  const selectMode = picking || commentMode;
  const setSelection = comment.guard(props.setSelection);

  const frames = usePreviewFrames({
    baseUrl,
    directionId,
    kind,
    lastChange,
    live,
    marquee,
    onContextMenu,
    onError,
    onFrameWheel,
    onModeExited,
    onTextEdit,
    onZoomKey,
    projectId,
    selectMode,
    selection,
    setSelection,
    textEditAllowed,
  });

  const covered = useFirstBuildCover(firstBuild, frames.slots.length);
  useResetOnChange(frames.frontToken, inline.reset);
  useTokenFrames(frames.slots, frames.elements, kind, live);
  usePlannedEdits(projectId, directionId, live);

  return { covered, frames, inline, stageEl };
};

const toDirectionInput = (
  props: ViewProps,
  text: CanvasStageState,
  hold: boolean
): Parameters<typeof useDirectionFrames>[0] => {
  const { projectId, kind, lastChange } = props;
  const { frameStates, live } = text;
  const activeId = text.active.id;
  const currentId = props.directionId;
  const currentUrl = text.baseUrl;
  const directions = knownList(props.directions);
  const frames = text.shown;

  return {
    activeId,
    currentId,
    currentUrl,
    directions,
    frameStates,
    frames,
    hold,
    kind,
    lastChange,
    live,
    projectId,
  };
};

const useCanvasPreview = (
  props: ViewProps,
  text: CanvasStageState
): CanvasPreview => {
  const { directionId, running, selection, setSelection, shell } = props;
  const { comment, commentMode, live, picking, protoOn } = text;
  const { selectMode, setProtoOn, setSelectMode } = text;
  const { layersOpen, toggleEdit } = text;

  const openMenu = useRef<(at: MenuPoint) => void>(() => null);
  const state = usePreviewState(props, text, openMenu);
  const { frames, stageEl: stage } = state;
  const hold = frames.slots.length > 1;
  const passive = useDirectionFrames(toDirectionInput(props, text, hold));
  const theme = useCanvasTheme();

  useEffect(
    () => setCanvasFront(frames.frontToken, hold),
    [frames.frontToken, hold]
  );
  useEffect(() => (): void => setCanvasFront(null, false), []);

  const portFrames = toLiveFrames(live, frames);
  useFramePort(props.port, portFrames, props.lastChange, props.kind);

  const offProto = (): void => setProtoOn(false);
  const { post } = frames;

  useStageKeys({
    commentMode,
    directionId,
    live,
    offProto,
    picking,
    post,
    protoOn,
    running,
    selection,
    setSelectMode,
    setSelection,
    shell,
    stage,
  });

  const commentOn = comment.on;

  useEffect(() => {
    if (selectMode || commentOn) {
      setProtoOn(false);
    }
  }, [selectMode, commentOn, setProtoOn]);
  useLayersWatch(frames.watchTree, layersOpen, frames.frontToken, toggleEdit);
  useSelectMoveKeys(picking, selection, frames.selectRelative);
  const editsEnabled = live && !running && directionId !== null;

  return { ...state, editsEnabled, openMenu, passive, theme };
};

export { useCanvasPreview };
