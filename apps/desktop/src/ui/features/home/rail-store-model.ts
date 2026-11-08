import { useSyncExternalStore } from "react";

import { openProject } from "../../app/project-nav.js";
import { readStored, writeStored } from "../../platform/storage.js";

type RailState = "open" | "mini";

const KEY = "design-studio.rail.v1";

const OVERLAY_QUERY = "(max-width: 1279px)";

const listeners = new Set<() => void>();

const getRail = (): RailState => {
  if (readStored(KEY) === "open") {
    return "open";
  }

  return "mini";
};

let railState: RailState = getRail();

const getRailState = (): RailState => railState;

const setRail = (next: RailState): void => {
  railState = next;

  writeStored(KEY, next);

  for (const listener of listeners) {
    listener();
  }
};

const setRailToggled = (): void => {
  if (railState === "open") {
    setRail("mini");
  } else {
    setRail("open");
  }
};

const toRailSubscription = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return (): void => {
    listeners.delete(listener);
  };
};

const useRail = (): RailState =>
  useSyncExternalStore(toRailSubscription, getRailState);

const isFloating = (): boolean => globalThis.matchMedia(OVERLAY_QUERY).matches;

const runPickProject = (id: string): void => {
  if (railState === "open" && isFloating()) {
    setRail("mini");
  }

  openProject(id);
};

export {
  getRailState,
  isFloating,
  runPickProject,
  setRail,
  setRailToggled,
  useRail,
};

export type { RailState };
