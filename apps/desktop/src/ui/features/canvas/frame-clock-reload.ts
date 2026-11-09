import type {
  FrameStateDef,
  FrameStatesView,
} from "@design-studio/contracts/frame-state";

import { reloadFramesMatching } from "../../platform/stage-dom.js";

const RELOAD_DELAY_MS = 60;

const toClockKey = (def: FrameStateDef): string =>
  `${def.clock ?? ""}|${def.isClockFrozen === true}`;

const toClockChangedIds = (
  prior: FrameStatesView | null,
  next: FrameStatesView
): string[] => {
  const ids: string[] = [];

  const before = new Map(
    (prior?.states ?? []).map((state) => [state.id, toClockKey(state)])
  );

  for (const def of next.states) {
    const key = before.get(def.id) ?? null;

    if (key !== null && key !== toClockKey(def)) {
      ids.push(def.id);
    }
  }

  return ids;
};

const reloadClockFrames = (ids: readonly string[]): void => {
  if (ids.length === 0) {
    return;
  }

  setTimeout(() => {
    for (const id of ids) {
      reloadFramesMatching(`iframe.frame[src*="//s-${id}."]`, document);
    }
  }, RELOAD_DELAY_MS);
};

export { reloadClockFrames, toClockChangedIds };
