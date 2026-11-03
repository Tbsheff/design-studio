import { useCallback, useEffect, useRef } from "react";

import { useFirstBuildCover } from "../chat/use-first-build.js";
import {
  setCanvasFront,
  useCanvasTheme,
  useTokenFrames,
} from "../design-system/token-frames.js";
import { usePlannedEdits } from "../inspector/use-planned-edits.js";
import { knownList, marqueeAllowed } from "./canvas-helpers.js";
import { useLayersWatch, useSelectMoveKeys } from "./canvas-layers.js";
import type { ViewProps } from "./canvas-types.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import { useDirectionFrames } from "./use-direction-frames.js";
import { useInlineTextEdit } from "./use-inline-text-edit.js";
import { usePreviewFrames } from "./use-preview-frames.js";
import { useFramePort } from "./use-preview-url.js";
import { useStageKeys } from "./use-stage-keys.js";

const useCanvasPreview = (
  props: ViewProps,
  s: ReturnType<typeof useCanvasStage>
) => {
  const { projectId, directionId, kind } = props;

  const {
    stageRef,
    active,
    shown,
    pz,
    zoomBy,
    selectMode,
    setSelectMode,
    comment,
    commentMode,
    live,
    pane,
    protoOn,
    setProtoOn,
    layersOpen,
    toggleEdit,
    picking,
    baseUrl,
    frameStates,
    firstBuild,
  } = s;

  const textEditAllowed = live && !props.running && !commentMode;

  const resetPreview = () =>
    props.port?.current?.post({ type: "preview-reset" });

  const stageEl = useCallback(() => stageRef.current, []);

  const inline = useInlineTextEdit(
    textEditAllowed,
    props.onTextCommit,
    resetPreview,
    stageEl
  );

  const openMenu = useRef<(at: { x: number; y: number }) => void>(() => null);

  const frames = usePreviewFrames({
    baseUrl: firstBuild.url,
    directionId,
    kind,
    lastChange: props.lastChange,
    live,
    marquee: marqueeAllowed(pane.picking, protoOn, commentMode),
    onContextMenu: (at) => openMenu.current(at),
    onError: props.onError,
    onFrameWheel: pz.frameWheel,
    onModeExited: () => {
      setSelectMode(false);
      setProtoOn(false);
      comment.setOn(false);
    },
    onTextEdit: inline.onMessage,
    onZoomKey: (key) => zoomBy(key, "frame"),
    projectId,
    selectMode: picking || commentMode,
    selection: props.selection,
    setSelection: comment.guard(props.setSelection),
    textEditAllowed,
  });

  const covered = useFirstBuildCover(firstBuild, frames.slots.length);
  const resetInline = inline.reset;
  useEffect(() => resetInline(), [frames.frontToken, resetInline]);
  useTokenFrames(frames.slots, frames.elements, kind, live);
  usePlannedEdits(projectId, directionId, live);

  const passive = useDirectionFrames({
    activeId: active.id,
    currentId: directionId,
    currentUrl: baseUrl,
    directions: knownList(props.directions),
    frameStates,
    frames: shown,
    hold: frames.slots.length > 1,
    kind,
    lastChange: props.lastChange,
    live,
    projectId,
  });

  const theme = useCanvasTheme();
  useEffect(
    () => setCanvasFront(frames.frontToken, frames.slots.length > 1),
    [frames.frontToken, frames.slots.length]
  );
  useEffect(() => () => setCanvasFront(null, false), []);

  useFramePort(props.port, live ? frames : null, props.lastChange, kind);

  useStageKeys({
    commentMode,
    directionId,
    live,
    offProto: () => setProtoOn(false),
    picking,
    post: frames.post,
    protoOn,
    running: props.running,
    selection: props.selection,
    setSelectMode,
    setSelection: props.setSelection,
    shell: props.shell,
    stage: stageEl,
  });
  useEffect(() => {
    if (selectMode || comment.on) {
      setProtoOn(false);
    }
  }, [selectMode, comment.on]);
  useLayersWatch(frames.watchTree, layersOpen, frames.frontToken, toggleEdit);
  useSelectMoveKeys(picking, props.selection, frames.selectRelative);
  const editsEnabled = live && !props.running && directionId !== null;

  return {
    covered,
    editsEnabled,
    frames,
    inline,
    openMenu,
    passive,
    stageEl,
    theme,
  };
};

export { useCanvasPreview };
