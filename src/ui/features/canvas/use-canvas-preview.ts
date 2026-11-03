import { useCallback, useEffect, useRef } from "react";

import {
  setCanvasFront,
  useCanvasTheme,
  useTokenFrames,
} from "../../tokenFrames.js";
import { useDirectionFrames } from "../../useDirectionFrames.js";
import { useFirstBuildCover } from "../../useFirstBuild.js";
import { useInlineTextEdit } from "../../useInlineTextEdit.js";
import { usePlannedEdits } from "../../usePlannedEdits.js";
import { usePreviewFrames } from "../../usePreviewFrames.js";
import { knownList, marqueeAllowed } from "./canvas-helpers.js";
import { useLayersWatch, useSelectMoveKeys } from "./canvas-layers.js";
import type { ViewProps } from "./canvas-types.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
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

  const openMenu = useRef<(at: { x: number; y: number }) => void>(
    () => undefined
  );

  const frames = usePreviewFrames({
    projectId,
    directionId,
    kind,
    baseUrl: firstBuild.url,
    live,
    lastChange: props.lastChange,
    selectMode: picking || commentMode,
    marquee: marqueeAllowed(pane.picking, protoOn, commentMode),
    selection: props.selection,
    setSelection: comment.guard(props.setSelection),
    onError: props.onError,
    onModeExited: () => {
      setSelectMode(false);
      setProtoOn(false);
      comment.setOn(false);
    },
    onFrameWheel: pz.frameWheel,
    onZoomKey: (key) => zoomBy(key, "frame"),
    textEditAllowed,
    onTextEdit: inline.onMessage,
    onContextMenu: (at) => openMenu.current(at),
  });

  const covered = useFirstBuildCover(firstBuild, frames.slots.length);
  const resetInline = inline.reset;
  useEffect(() => resetInline(), [frames.frontToken, resetInline]);
  useTokenFrames(frames.slots, frames.elements, kind, live);
  usePlannedEdits(projectId, directionId, live);

  const passive = useDirectionFrames({
    projectId,
    kind,
    frames: shown,
    activeId: active.id,
    currentId: directionId,
    currentUrl: baseUrl,
    live,
    lastChange: props.lastChange,
    hold: frames.slots.length > 1,
    directions: knownList(props.directions),
    frameStates,
  });

  const theme = useCanvasTheme();
  useEffect(
    () => setCanvasFront(frames.frontToken, frames.slots.length > 1),
    [frames.frontToken, frames.slots.length]
  );
  useEffect(() => () => setCanvasFront(null, false), []);

  useFramePort(props.port, live ? frames : null, props.lastChange, kind);

  useStageKeys({
    stage: stageEl,
    selection: props.selection,
    setSelection: props.setSelection,
    setSelectMode,
    offProto: () => setProtoOn(false),
    post: frames.post,
    shell: props.shell,
    picking,
    live,
    running: props.running,
    directionId,
    commentMode,
    protoOn,
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
    stageEl,
    inline,
    openMenu,
    frames,
    covered,
    passive,
    theme,
    editsEnabled,
  };
};

export { useCanvasPreview };
