import type { ZoomKey } from "@design-studio/contracts";

import {
  applyZoomKey,
  fitZoom,
  freezeZoom,
  zoomAt,
  zoomStep,
  zoomTo,
  zoomToActive,
} from "./pan-zoom-actions.js";
import { applyFrameWheel } from "./pan-zoom-frame-wheel.js";
import type { PanZoomState } from "./pan-zoom-state.js";
import type { FrameWheel } from "./pan-zoom-wheel-types.js";

interface PanZoomApi {
  applyZoomKey: (key: ZoomKey) => void;
  fit: () => void;
  frameWheel: (frame: HTMLIFrameElement | null, wheel: FrameWheel) => void;
  freeze: () => void;
  zoomAt: (stageX: number, stageY: number, factor: number) => void;
  zoomStep: (direction: 1 | -1) => void;
  zoomTo: (zoom: number) => void;
  zoomToActive: () => void;
}

const toPanZoomApi = (state: PanZoomState): PanZoomApi => ({
  applyZoomKey: (key) => applyZoomKey(state, key),
  fit: () => fitZoom(state),
  frameWheel: (frame, wheel) => applyFrameWheel(state, frame, wheel),
  freeze: () => freezeZoom(state),
  zoomAt: (stageX, stageY, factor) => zoomAt(state, stageX, stageY, factor),
  zoomStep: (direction) => zoomStep(state, direction),
  zoomTo: (zoom) => zoomTo(state, zoom),
  zoomToActive: () => zoomToActive(state),
});

export { toPanZoomApi };

export type { PanZoomApi };
