import type { ZoomKey } from "@design-studio/contracts";
import { useCallback, useMemo, useReducer, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { LiveStore } from "../../platform/live-store.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import type { Box } from "./canvas-frames-model.js";
import { toCommittedZoom } from "./pan-zoom-actions.js";
import { toPanZoomApi } from "./pan-zoom-api.js";
import { handlePointerDown } from "./pan-zoom-pointer.js";
import { createPanZoomState } from "./pan-zoom-state.js";
import type { Options } from "./pan-zoom-types.js";
import type { FrameWheel } from "./pan-zoom-wheel-types.js";
import { useHeldKeys } from "./use-pan-zoom-held-keys.js";
import {
  useActiveShift,
  useFitReset,
  useLiveMirror,
  usePaintEffects,
  useStageSize,
} from "./use-pan-zoom-layout.js";
import { usePanZoomWheel } from "./use-pan-zoom-wheel.js";

interface PanZoom {
  zoom: number;
  zoomPercent: LiveStore<number>;
  panning: boolean;
  spaceHeld: boolean;
  zoomHeld: boolean;
  onPointerDown: (event: ReactPointerEvent) => void;
  zoomAt: (stageX: number, stageY: number, factor: number) => void;
  zoomTo: (zoom: number) => void;
  zoomStep: (direction: 1 | -1) => void;
  fit: () => void;
  zoomToActive: () => void;
  zoomToBox: (box: Box) => void;
  freeze: () => void;
  applyZoomKey: (key: ZoomKey) => void;
  frameWheel: (frame: HTMLIFrameElement | null, frameWheel: FrameWheel) => void;
}

const countRender = (count: number): number => count + 1;

const usePanZoom = ({
  stageRef,
  artboardRef,
  layout,
  setting,
  selectionRect,
  isInspectorOpen,
}: Options): PanZoom => {
  const [panning, setPanning] = useState(false);
  const { spaceHeld, zoomHeld } = useHeldKeys();
  const [, requestRender] = useReducer(countRender, 0);

  const state = useMemo(
    () => createPanZoomState(stageRef, artboardRef, requestRender),
    [stageRef, artboardRef, requestRender]
  );

  const stage = useStageSize(stageRef, isInspectorOpen, state.fitCount);

  const api = useMemo(() => toPanZoomApi(state), [state]);
  const committedZoom = toCommittedZoom(stage, layout.bounds, setting);

  useLiveMirror(state, {
    committedZoom,
    layout,
    selectionRect,
    setting,
    stage,
  });
  useActiveShift(state, layout);
  useFitReset(state, layout, setting);
  usePaintEffects(state);
  usePanZoomWheel(state, stageRef);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent): void =>
      handlePointerDown(state, event, { spaceHeld, zoomHeld }, setPanning),
    [state, spaceHeld, zoomHeld]
  );

  return {
    ...api,
    onPointerDown,
    panning,
    spaceHeld,
    zoom: state.zoomOverride ?? committedZoom,
    zoomHeld,
    zoomPercent: state.zoomPercent,
  };
};

export { isTypingTarget, usePanZoom };

export type { PanZoom };
