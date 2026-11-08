import type { ZoomKey } from "@design-studio/contracts";

import { uiStore } from "../../platform/storage.js";
import type { ZoomSetting } from "../../platform/storage.js";
import type { Box } from "./canvas-frames-model.js";
import {
  SELECTION_PAD,
  WHEEL_IDLE_MS,
  ZOOM_STEP,
  clampZoom,
  fitZoomFor,
} from "./pan-zoom-model.js";
import { paintState, schedulePaint } from "./pan-zoom-paint.js";
import { toNumericBase, toView } from "./pan-zoom-state.js";
import type { PanZoomState, Stage } from "./pan-zoom-state.js";

const toCommittedZoom = (
  stage: Stage,
  bounds: Box,
  zoom: ZoomSetting
): number => {
  if (zoom === "fit") {
    return fitZoomFor(stage.width, stage.height, bounds);
  }

  return zoom;
};

const clearWheelTimer = (state: PanZoomState): void => {
  if (state.wheelTimer !== null) {
    globalThis.clearTimeout(state.wheelTimer);
  }

  state.wheelTimer = null;
};

const commitZoom = (state: PanZoomState, zoom: ZoomSetting): void => {
  clearWheelTimer(state);
  state.zoomOverride = null;

  state.live = {
    ...state.live,
    committedZoom: toCommittedZoom(
      state.live.stage,
      state.live.layout.bounds,
      zoom
    ),
    setting: zoom,
  };
  paintState(state);
  uiStore.set({ zoom });
};

const placeAt = (
  state: PanZoomState,
  stageX: number,
  stageY: number,
  factor: number
): number => {
  const cur = toView(state);
  const next = clampZoom(cur.zoom * factor);
  const anchorX = (stageX - cur.x) / cur.zoom;
  const anchorY = (stageY - cur.y) / cur.zoom;
  const base = toNumericBase(state.live.stage, state.live.layout.active, next);

  state.offset = {
    x: stageX - anchorX * next - base.x,
    y: stageY - anchorY * next - base.y,
  };

  return next;
};

const zoomAt = (
  state: PanZoomState,
  stageX: number,
  stageY: number,
  factor: number
): void => commitZoom(state, placeAt(state, stageX, stageY, factor));

const settleWheel = (state: PanZoomState): void => {
  state.wheelTimer = null;
  const { zoomOverride } = state;

  if (zoomOverride !== null) {
    commitZoom(state, zoomOverride);
  }
};

const wheelZoomAt = (
  state: PanZoomState,
  stageX: number,
  stageY: number,
  factor: number
): void => {
  state.zoomOverride = placeAt(state, stageX, stageY, factor);
  schedulePaint(state);

  if (state.wheelTimer !== null) {
    globalThis.clearTimeout(state.wheelTimer);
  }

  state.wheelTimer = globalThis.setTimeout(
    () => settleWheel(state),
    WHEEL_IDLE_MS
  );
};

const zoomTo = (state: PanZoomState, zoom: number): void => {
  const { stage } = state.live;
  zoomAt(state, stage.width / 2, stage.height / 2, zoom / toView(state).zoom);
};

const zoomStep = (state: PanZoomState, direction: 1 | -1): void =>
  zoomTo(state, toView(state).zoom * ZOOM_STEP ** direction);

const fitZoom = (state: PanZoomState): void => {
  state.offset = { x: 0, y: 0 };
  commitZoom(state, "fit");
};

const zoomToBox = (state: PanZoomState, box: Box): void => {
  const { stage, layout } = state.live;

  const zoom = clampZoom(
    Math.min(
      (stage.width - SELECTION_PAD * 2) / Math.max(1, box.width),
      (stage.height - SELECTION_PAD * 2) / Math.max(1, box.height)
    )
  );

  const base = toNumericBase(stage, layout.active, zoom);
  state.offset = {
    x: Math.round(stage.width / 2 - (box.x + box.width / 2) * zoom) - base.x,
    y: Math.round(stage.height / 2 - (box.y + box.height / 2) * zoom) - base.y,
  };
  commitZoom(state, zoom);
};

const toActiveBox = (state: PanZoomState): Box => {
  const { active } = state.live.layout;

  return { height: active.height, width: active.width, x: 0, y: 0 };
};

const zoomToActive = (state: PanZoomState): void => {
  state.pendingFocus = true;
  state.requestRender();
};

const flushPendingFocus = (state: PanZoomState): void => {
  if (!state.pendingFocus) {
    return;
  }

  state.pendingFocus = false;
  zoomToBox(state, toActiveBox(state));
};

const freezeZoom = (state: PanZoomState): void => {
  const cur = state.live;

  if (state.zoomOverride !== null || cur.setting !== "fit") {
    return;
  }

  const view = state.painted ?? toView(state);
  const base = toNumericBase(cur.stage, cur.layout.active, view.zoom);
  state.offset = { x: view.x - base.x, y: view.y - base.y };
  commitZoom(state, view.zoom);
};

const applyZoomKey = (state: PanZoomState, key: ZoomKey): void => {
  if (key === "in") {
    zoomStep(state, 1);

    return;
  }

  if (key === "out") {
    zoomStep(state, -1);

    return;
  }

  if (key === "actual") {
    zoomTo(state, 1);

    return;
  }

  if (key === "fit") {
    fitZoom(state);

    return;
  }

  zoomToBox(state, state.live.selectionRect() ?? toActiveBox(state));
};

export {
  applyZoomKey,
  clearWheelTimer,
  commitZoom,
  fitZoom,
  flushPendingFocus,
  freezeZoom,
  toCommittedZoom,
  wheelZoomAt,
  zoomAt,
  zoomStep,
  zoomTo,
  zoomToActive,
};
