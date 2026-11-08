import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { ZoomSetting } from "../../platform/storage.js";
import { flushPendingFocus } from "./pan-zoom-actions.js";
import { paintState } from "./pan-zoom-paint.js";
import type { PanZoomLive, PanZoomState, Stage } from "./pan-zoom-state.js";
import {
  resetOffset,
  shiftOffsetForActive,
  syncLive,
} from "./pan-zoom-sync.js";
import type { ActiveSpot } from "./pan-zoom-sync.js";
import type { PanZoomLayout } from "./pan-zoom-types.js";

const useStageSize = (stageRef: RefObject<HTMLDivElement | null>): Stage => {
  const [stage, setStage] = useState<Stage>({ height: 0, width: 0 });

  useLayoutEffect(() => {
    const element = stageRef.current;

    if (!element) {
      return;
    }

    const measure = (): void =>
      setStage({ height: element.clientHeight, width: element.clientWidth });

    const observer = new ResizeObserver(measure);

    observer.observe(element);
    measure();

    return (): void => observer.disconnect();
  }, [stageRef]);

  return stage;
};

const useLiveMirror = (state: PanZoomState, live: PanZoomLive): void => {
  useLayoutEffect(() => {
    syncLive(state, live);
  });
};

const useActiveShift = (state: PanZoomState, layout: PanZoomLayout): void => {
  const prevActive = useRef<ActiveSpot | null>(null);
  const { activeId } = layout;
  const { x: activeX, y: activeY } = layout.active;

  useLayoutEffect(() => {
    const next = { id: activeId, x: activeX, y: activeY };
    shiftOffsetForActive(state, prevActive.current, next);
    prevActive.current = next;
  }, [state, activeId, activeX, activeY]);
};

const useFitReset = (
  state: PanZoomState,
  layout: PanZoomLayout,
  setting: ZoomSetting
): void => {
  const isFit = setting === "fit";
  const { width: activeWidth, height: activeHeight } = layout.active;
  const { x, y, width, height } = layout.bounds;
  const key = [activeWidth, activeHeight, x, y, width, height].join(":");

  useLayoutEffect(() => {
    resetOffset(state, isFit, key);
  }, [state, isFit, key]);
};

const usePaintEffects = (state: PanZoomState): void => {
  useLayoutEffect(() => {
    paintState(state);
    flushPendingFocus(state);
  });

  useLayoutEffect(
    () => (): void => cancelAnimationFrame(state.paintFrame),
    [state]
  );
};

export {
  useActiveShift,
  useFitReset,
  useLiveMirror,
  usePaintEffects,
  useStageSize,
};
