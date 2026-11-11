import type { ZoomKey } from "@design-studio/contracts";
import { useMemo } from "react";

import { useComponentInsert } from "../design-system/use-component-insert.js";
import { useElementNudge } from "../inspector/use-element-nudge.js";
import { useImageDrop } from "../inspector/use-image-drop.js";
import { useLayerEdits } from "../versions-layers-tokens/use-layer-edits.js";
import type { ViewProps } from "./canvas-types.js";
import { useAgentPresence } from "./use-agent-presence.js";
import { useCanvasPoint } from "./use-canvas-point.js";
import { useCanvasPresence } from "./use-canvas-presence.js";
import type { useCanvasPreview } from "./use-canvas-preview.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import { useCanvasVectorTools } from "./use-canvas-vector-tools.js";
import { useFreeMove } from "./use-free-move.js";
import { useResizeHandles } from "./use-resize-handles.js";

type CanvasStageState = ReturnType<typeof useCanvasStage>;

type CanvasPreviewState = ReturnType<typeof useCanvasPreview>;

type LayerEdits = ReturnType<typeof useLayerEdits>;

interface EditTools {
  readonly layerEdits: LayerEdits;
}

interface EditHandles {
  readonly freeMove: ReturnType<typeof useFreeMove>;
  readonly handlesOn: boolean;
  readonly resize: ReturnType<typeof useResizeHandles>;
  readonly spacingHost: SpacingHost;
}

interface SpacingHost {
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly holdSwap: CanvasPreviewState["frames"]["holdSwap"];
  readonly listen: CanvasPreviewState["frames"]["listen"];
  readonly onError: LayerEdits["notify"];
  readonly post: CanvasPreviewState["frames"]["post"];
  readonly projectId: string;
  readonly refreshRects: CanvasPreviewState["frames"]["refreshRects"];
  readonly setSelection: ViewProps["setSelection"];
}

interface CanvasEdits extends EditTools, EditHandles {
  readonly pointBadge: ReturnType<typeof useCanvasPoint>;
  readonly presence: ReturnType<typeof useAgentPresence>;
}

const useEditTools = (
  props: ViewProps,
  text: CanvasStageState,
  pv: CanvasPreviewState
): EditTools => {
  const { projectId, directionId, kind, headVersionId } = props;
  const { selection, setSelection } = props;
  const { comment, draw, layersOpen, picking, protoOn } = text;
  const { frames, editsEnabled } = pv;
  const selectMode = picking;
  const treeWanted = layersOpen;
  const enabled = editsEnabled;

  const layerEdits = useLayerEdits({
    directionId,
    enabled,
    frames,
    headVersionId,
    kind,
    projectId,
    selectMode,
    selection,
    setSelection,
    treeWanted,
  });

  const { notify } = layerEdits;
  useComponentInsert({
    directionId,
    enabled,
    frames,
    kind,
    notify,
    projectId,
    selection,
  });
  useCanvasVectorTools(editsEnabled, protoOn, draw, comment);
  const isEnabled = editsEnabled;
  useImageDrop({ directionId, frames, isEnabled, kind, notify, projectId });

  return { layerEdits };
};

const useEditHandles = (
  props: ViewProps,
  text: CanvasStageState,
  pv: CanvasPreviewState,
  layerEdits: LayerEdits
): EditHandles => {
  const { projectId, directionId, selection, setSelection } = props;
  const { holdSwap, listen, post, refreshRects } = pv.frames;
  const { notify } = layerEdits;
  const onError = notify;
  const handlesOn = pv.editsEnabled && !text.commentMode;
  const enabled = handlesOn;
  const { applyStructure, busy } = layerEdits;
  const { zoom } = text.pz;

  const resize = useResizeHandles({
    directionId,
    enabled,
    holdSwap,
    listen,
    onError,
    post,
    projectId,
    refreshRects,
    selection,
    setSelection,
  });

  const spacingHost = useMemo(
    () => ({
      directionId,
      enabled,
      holdSwap,
      listen,
      onError,
      post,
      projectId,
      refreshRects,
      setSelection,
    }),
    [
      directionId,
      enabled,
      holdSwap,
      listen,
      onError,
      post,
      projectId,
      refreshRects,
      setSelection,
    ]
  );

  const freeMove = useFreeMove({
    applyStructure,
    busy,
    directionId,
    enabled,
    holdSwap,
    listen,
    onError,
    post,
    projectId,
    refreshRects,
    selection,
    setSelection,
    zoom,
  });

  return { freeMove, handlesOn, resize, spacingHost };
};

const useCanvasEdits = (
  props: ViewProps,
  text: CanvasStageState,
  pv: CanvasPreviewState
): CanvasEdits => {
  const { projectId, directionId, selection, setSelection } = props;
  const { active, canvasFrames, stageRef, viewport, zoomBy } = text;
  const tools = useEditTools(props, text, pv);
  const handles = useEditHandles(props, text, pv, tools.layerEdits);
  const { listen, post, refreshRects } = pv.frames;
  const { notify } = tools.layerEdits;
  const onError = notify;
  const isEnabled = handles.handlesOn;

  useElementNudge({
    directionId,
    isEnabled,
    listen,
    onError,
    post,
    projectId,
    refreshRects,
    selection,
    setSelection,
  });

  const activeId = active.id;
  const liveSize = viewport;
  const stage = (): HTMLDivElement | null => stageRef.current;
  useCanvasPresence({
    activeId,
    directionId,
    liveSize,
    projectId,
    selection,
    stage,
  });
  const clearSelection = (): void => setSelection(() => []);
  const frames = canvasFrames;
  const zoom = (key: ZoomKey): void => zoomBy(key, "menu");

  const pointBadge = useCanvasPoint({
    clearSelection,
    frames,
    post,
    projectId,
    zoom,
  });

  const presence = useAgentPresence({ directionId, frames, projectId });

  return { ...tools, ...handles, pointBadge, presence };
};

export { useCanvasEdits };
