import type { RefObject } from "react";

import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { ZoomSetting } from "../../platform/storage.js";
import type { Box } from "./canvas-frames-model.js";
import { LINE_PX, RAIL_INSET, ZOOM_100, fitTop } from "./pan-zoom-model.js";
import type { PanZoomLayout } from "./pan-zoom-types.js";
import type { WheelInput } from "./pan-zoom-wheel-types.js";

const WHEEL_UNIT_LINE = 1;

const WHEEL_UNIT_PAGE = 2;

interface Stage {
  height: number;
  width: number;
}

interface Point {
  x: number;
  y: number;
}

interface View {
  zoom: number;
  x: number;
  y: number;
}

interface PanZoomLive {
  committedZoom: number;
  layout: PanZoomLayout;
  selectionRect: () => Box | null;
  setting: ZoomSetting;
  stage: Stage;
}

interface FrameOrigin {
  at: number;
  frame: HTMLIFrameElement;
  height: number;
  x: number;
  y: number;
}

interface PanZoomState {
  artboardRef: RefObject<HTMLDivElement | null>;
  fitCount: number;
  fitKey: string | null;
  frameOrigin: FrameOrigin | null;
  live: PanZoomLive;
  offset: Point;
  paintFrame: number;
  painted: View | null;
  pendingFocus: boolean;
  requestRender: () => void;
  stageRef: RefObject<HTMLDivElement | null>;
  wheelTimer: ReturnType<typeof globalThis.setTimeout> | null;
  zoomOverride: number | null;
  zoomPercent: LiveStore<number>;
}

const EMPTY_BOX: Box = { height: 0, width: 0, x: 0, y: 0 };

const EMPTY_LIVE: PanZoomLive = {
  committedZoom: 1,
  layout: { active: EMPTY_BOX, activeId: "", bounds: EMPTY_BOX },
  selectionRect: () => null,
  setting: "fit",
  stage: { height: 0, width: 0 },
};

const toWheelUnit = (deltaMode: number, pageHeight: number): number => {
  if (deltaMode === WHEEL_UNIT_LINE) {
    return LINE_PX;
  }

  if (deltaMode === WHEEL_UNIT_PAGE) {
    return pageHeight;
  }

  return 1;
};

const toWheelPixels = (wheelInput: WheelInput, pageHeight: number): Point => {
  const unit = toWheelUnit(wheelInput.deltaMode, pageHeight);

  return { x: wheelInput.deltaX * unit, y: wheelInput.deltaY * unit };
};

const toNumericBase = (stage: Stage, active: Box, zoom: number): Point => ({
  x: Math.max(RAIL_INSET, Math.round((stage.width - active.width * zoom) / 2)),
  y: fitTop(stage.height, active.height * zoom),
});

const toFitBase = (
  stage: Stage,
  layout: PanZoomLayout,
  zoom: number
): Point => {
  const { bounds, active } = layout;

  return {
    x:
      Math.round((stage.width - bounds.width * zoom) / 2) +
      (active.x - bounds.x) * zoom,
    y:
      fitTop(stage.height, bounds.height * zoom) + (active.y - bounds.y) * zoom,
  };
};

const toBase = (
  live: PanZoomLive,
  override: number | null,
  zoom: number
): Point => {
  if (override === null && live.setting === "fit") {
    return toFitBase(live.stage, live.layout, zoom);
  }

  return toNumericBase(live.stage, live.layout.active, zoom);
};

const toView = (state: PanZoomState): View => {
  const override = state.zoomOverride;
  const zoom = override ?? state.live.committedZoom;
  const base = toBase(state.live, override, zoom);

  return { x: base.x + state.offset.x, y: base.y + state.offset.y, zoom };
};

const createPanZoomState = (
  stage: RefObject<HTMLDivElement | null>,
  artboard: RefObject<HTMLDivElement | null>,
  render: () => void
): PanZoomState => ({
  artboardRef: artboard,
  fitCount: 0,
  fitKey: null,
  frameOrigin: null,
  live: EMPTY_LIVE,
  offset: { x: 0, y: 0 },
  paintFrame: 0,
  painted: null,
  pendingFocus: false,
  requestRender: render,
  stageRef: stage,
  wheelTimer: null,
  zoomOverride: null,
  zoomPercent: createLiveStore(ZOOM_100),
});

export { createPanZoomState, toNumericBase, toView, toWheelPixels };

export type { FrameOrigin, PanZoomLive, PanZoomState, Point, Stage, View };
