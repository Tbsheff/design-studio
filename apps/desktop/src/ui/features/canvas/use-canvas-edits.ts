import { useMemo } from "react";

import { useInlinePrompt } from "../chat/use-inline-prompt.js";
import { useComponentInsert } from "../design-system/use-component-insert.js";
import { useElementNudge } from "../inspector/use-element-nudge.js";
import { useImageDrop } from "../inspector/use-image-drop.js";
import { useLayerEdits } from "../versions-layers-tokens/use-layer-edits.js";
import { useCanvasVectorTools } from "./canvas-tool-slots.js";
import type { ViewProps } from "./canvas-types.js";
import { useCanvasPoint } from "./use-canvas-point.js";
import { useCanvasPresence } from "./use-canvas-presence.js";
import type { useCanvasPreview } from "./use-canvas-preview.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import { useFreeMove } from "./use-free-move.js";
import { usePreviewMenu } from "./use-preview-menu.js";
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
    directionId,
    enabled: editsEnabled,
    frames,
    headVersionId,
    kind,
    projectId,
    selectMode: picking,
    selection: props.selection,
    setSelection: props.setSelection,
    treeWanted: layersOpen,
  });

  useComponentInsert({
    directionId,
    enabled: editsEnabled,
    frames,
    kind,
    notify: layerEdits.notify,
    projectId,
    selection: props.selection,
  });
  useCanvasVectorTools(editsEnabled, protoOn, draw, comment);
  useImageDrop({
    directionId,
    frames,
    isEnabled: editsEnabled,
    kind,
    notify: layerEdits.notify,
    projectId,
  });

  const previewMenu = usePreviewMenu({
    edits: layerEdits,
    ids: { directionId, kind, projectId },
    port: props.port,
    selectRelative: frames.selectRelative,
    selection: props.selection,
    zoom: (key) => zoomBy(key, "menu"),
  });

  openMenu.current = previewMenu.onContextMenu;

  const inlinePrompt = useInlinePrompt({
    live,
    onSubmit: props.onInlinePrompt,
    route: active.path,
    running: props.running,
    selection: props.selection,
    stage: () => stageRef.current,
  });

  const handlesOn = editsEnabled && !commentMode;

  const resize = useResizeHandles({
    directionId,
    enabled: handlesOn,
    holdSwap: frames.holdSwap,
    listen: frames.listen,
    onError: layerEdits.notify,
    post: frames.post,
    projectId,
    refreshRects: frames.refreshRects,
    selection: props.selection,
    setSelection: props.setSelection,
  });

  const spacingHost = useMemo(
    () => ({
      directionId,
      enabled: handlesOn,
      holdSwap: frames.holdSwap,
      listen: frames.listen,
      onError: layerEdits.notify,
      post: frames.post,
      projectId,
      refreshRects: frames.refreshRects,
      setSelection: props.setSelection,
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
    applyStructure: layerEdits.applyStructure,
    busy: layerEdits.busy,
    directionId,
    enabled: handlesOn,
    holdSwap: frames.holdSwap,
    listen: frames.listen,
    onError: layerEdits.notify,
    post: frames.post,
    projectId,
    refreshRects: frames.refreshRects,
    selection: props.selection,
    setSelection: props.setSelection,
    zoom: pz.zoom,
  });

  useElementNudge({
    directionId,
    isEnabled: handlesOn,
    listen: frames.listen,
    onError: layerEdits.notify,
    post: frames.post,
    projectId,
    refreshRects: frames.refreshRects,
    selection: props.selection,
    setSelection: props.setSelection,
  });

  useCanvasPresence({
    activeId: active.id,
    directionId,
    liveSize: viewport,
    projectId,
    selection: props.selection,
    stage: () => stageRef.current,
  });

  const pointBadge = useCanvasPoint({
    clearSelection: () => props.setSelection(() => []),
    frames: canvasFrames,
    post: frames.post,
    projectId,
    zoom: (key) => zoomBy(key, "menu"),
  });

  return {
    freeMove,
    handlesOn,
    inlinePrompt,
    layerEdits,
    pointBadge,
    previewMenu,
    resize,
    spacingHost,
  };
};

export { useCanvasEdits };
