import { useMemo } from "react";

import { useComponentInsert } from "../../useComponentInsert.js";
import { useElementNudge } from "../../useElementNudge.js";
import { useImageDrop } from "../../useImageDrop.js";
import { useInlinePrompt } from "../../useInlinePrompt.js";
import { useLayerEdits } from "../../useLayerEdits.js";
import { usePreviewMenu } from "../../usePreviewMenu.js";
import { useCanvasVectorTools } from "./canvas-tool-slots.js";
import type { ViewProps } from "./canvas-types.js";
import { useCanvasPoint } from "./use-canvas-point.js";
import { useCanvasPresence } from "./use-canvas-presence.js";
import type { useCanvasPreview } from "./use-canvas-preview.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import { useFreeMove } from "./use-free-move.js";
import { useResizeHandles } from "./use-resize-handles.js";

const useCanvasEdits = (
  props: ViewProps,
  s: ReturnType<typeof useCanvasStage>,
  pv: ReturnType<typeof useCanvasPreview>
) => {
  const { projectId, directionId, kind, headVersionId } = props;
  const {
    stageRef,
    canvasFrames,
    active,
    viewport,
    pz,
    zoomBy,
    comment,
    commentMode,
    live,
    protoOn,
    layersOpen,
    picking,
    draw,
  } = s;
  const { openMenu, frames, editsEnabled } = pv;
  const layerEdits = useLayerEdits({
    projectId,
    directionId,
    kind,
    enabled: editsEnabled,
    selectMode: picking,
    treeWanted: layersOpen,
    headVersionId,
    frames,
    selection: props.selection,
    setSelection: props.setSelection,
  });

  useComponentInsert({
    projectId,
    directionId,
    kind,
    enabled: editsEnabled,
    frames,
    selection: props.selection,
    notify: layerEdits.notify,
  });
  useCanvasVectorTools(editsEnabled, protoOn, draw, comment);
  useImageDrop({
    projectId,
    directionId,
    kind,
    enabled: editsEnabled,
    frames,
    notify: layerEdits.notify,
  });

  const previewMenu = usePreviewMenu({
    selection: props.selection,
    port: props.port,
    selectRelative: frames.selectRelative,
    zoom: (key) => zoomBy(key, "menu"),
    edits: layerEdits,
    ids: { projectId, directionId, kind },
  });

  openMenu.current = previewMenu.onContextMenu;

  const inlinePrompt = useInlinePrompt({
    selection: props.selection,
    live,
    running: props.running,
    onSubmit: props.onInlinePrompt,
    stage: () => stageRef.current,
    route: active.path,
  });

  const handlesOn = editsEnabled && !commentMode;

  const resize = useResizeHandles({
    projectId,
    directionId,
    selection: props.selection,
    enabled: handlesOn,
    post: frames.post,
    listen: frames.listen,
    holdSwap: frames.holdSwap,
    setSelection: props.setSelection,
    refreshRects: frames.refreshRects,
    onError: layerEdits.notify,
  });

  const spacingHost = useMemo(
    () => ({
      projectId,
      directionId,
      enabled: handlesOn,
      post: frames.post,
      listen: frames.listen,
      holdSwap: frames.holdSwap,
      setSelection: props.setSelection,
      refreshRects: frames.refreshRects,
      onError: layerEdits.notify,
    }),
    [
      projectId,
      directionId,
      handlesOn,
      frames.post,
      frames.listen,
      frames.holdSwap,
      props.setSelection,
      frames.refreshRects,
      layerEdits.notify,
    ]
  );

  const freeMove = useFreeMove({
    projectId,
    directionId,
    selection: props.selection,
    enabled: handlesOn,
    busy: layerEdits.busy,
    zoom: pz.zoom,
    post: frames.post,
    listen: frames.listen,
    holdSwap: frames.holdSwap,
    setSelection: props.setSelection,
    refreshRects: frames.refreshRects,
    onError: layerEdits.notify,
    applyStructure: layerEdits.applyStructure,
  });

  useElementNudge({
    projectId,
    directionId,
    selection: props.selection,
    enabled: handlesOn,
    post: frames.post,
    listen: frames.listen,
    setSelection: props.setSelection,
    refreshRects: frames.refreshRects,
    onError: layerEdits.notify,
  });

  useCanvasPresence({
    projectId,
    directionId,
    activeId: active.id,
    liveSize: viewport,
    selection: props.selection,
    stage: () => stageRef.current,
  });

  const pointBadge = useCanvasPoint({
    projectId,
    frames: canvasFrames,
    post: frames.post,
    clearSelection: () => props.setSelection(() => []),
    zoom: (key) => zoomBy(key, "menu"),
  });

  return {
    layerEdits,
    previewMenu,
    inlinePrompt,
    handlesOn,
    resize,
    spacingHost,
    freeMove,
    pointBadge,
  };
};

export { useCanvasEdits };
