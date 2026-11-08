import { toNumericBase } from "./pan-zoom-state.js";
import type { PanZoomLive, PanZoomState } from "./pan-zoom-state.js";

interface ActiveSpot {
  id: string;
  x: number;
  y: number;
}

const syncLive = (state: PanZoomState, live: PanZoomLive): void => {
  state.live = live;
};

const resetOffset = (
  state: PanZoomState,
  isFit: boolean,
  key: string
): void => {
  state.fitKey = key;

  if (isFit) {
    state.offset = { x: 0, y: 0 };
  }
};

const isSameSpot = (prev: ActiveSpot, next: ActiveSpot): boolean =>
  prev.id === next.id && prev.x === next.x && prev.y === next.y;

const shiftOffsetForActive = (
  state: PanZoomState,
  prev: ActiveSpot | null,
  next: ActiveSpot
): void => {
  const point = state.painted;

  if (!prev || !point || isSameSpot(prev, next)) {
    return;
  }

  const cur = state.live;

  if (state.zoomOverride === null && cur.setting === "fit") {
    return;
  }

  const base = toNumericBase(cur.stage, cur.layout.active, point.zoom);
  state.offset = {
    x: point.x + (next.x - prev.x) * point.zoom - base.x,
    y: point.y + (next.y - prev.y) * point.zoom - base.y,
  };
};

export { resetOffset, shiftOffsetForActive, syncLive };

export type { ActiveSpot };
