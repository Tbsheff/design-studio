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

const PIXEL_UNIT = /px$/u;

const RIGHT_GAPS = 2;

const BOTTOM_GAPS = 3;

const toCssPixels = (style: CSSStyleDeclaration, name: string): number => {
  const value = Number(
    style.getPropertyValue(name).trim().replace(PIXEL_UNIT, "")
  );

  if (Number.isNaN(value)) {
    return 0;
  }

  return value;
};

const toFreeStage = (element: HTMLElement, isInspectorOpen: boolean): Stage => {
  const style = getComputedStyle(element);
  const gap = toCssPixels(style, "--dock-gap");
  const inspector = toCssPixels(style, "--inspector-w");
  const tools = toCssPixels(style, "--tools-w");
  const zoomBar = toCssPixels(style, "--zoom-h");
  let right = 0;
  let bottom = 0;

  if (isInspectorOpen && inspector > 0) {
    right = inspector + gap * RIGHT_GAPS;
  }

  if (tools > 0) {
    bottom = tools + zoomBar + gap * BOTTOM_GAPS;
  }

  return {
    height: Math.max(0, element.clientHeight - bottom),
    width: Math.max(0, element.clientWidth - right),
  };
};

const useStageSize = (
  stageRef: RefObject<HTMLDivElement | null>,
  isInspectorOpen: boolean,
  fitCount: number
): Stage => {
  const [stage, setStage] = useState<Stage>({ height: 0, width: 0 });
  const inspectorOpen = useRef(isInspectorOpen);

  useLayoutEffect(() => {
    inspectorOpen.current = isInspectorOpen;
  });

  useLayoutEffect(() => {
    const element = stageRef.current;

    if (!element) {
      return;
    }

    const measure = (): void =>
      setStage(toFreeStage(element, inspectorOpen.current));

    const observer = new ResizeObserver(measure);

    observer.observe(element);
    measure();

    return (): void => observer.disconnect();
  }, [stageRef]);

  const seenFit = useRef(fitCount);

  useLayoutEffect(() => {
    const element = stageRef.current;

    if (!element || seenFit.current === fitCount) {
      return;
    }

    seenFit.current = fitCount;
    setStage(toFreeStage(element, inspectorOpen.current));
  }, [stageRef, fitCount]);

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
