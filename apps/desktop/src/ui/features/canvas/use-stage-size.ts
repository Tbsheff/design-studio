import { useMemo, useSyncExternalStore } from "react";

import type { StageSize } from "./play-model.js";

const SERVER_SIZE = 0;

const subscribe = (onChange: () => void): (() => void) => {
  const observer = new ResizeObserver(onChange);
  observer.observe(document.documentElement);

  return (): void => observer.disconnect();
};

const readWidth = (): number => globalThis.innerWidth;

const readHeight = (): number => globalThis.innerHeight;

const readServer = (): number => SERVER_SIZE;

const useStageSize = (): StageSize => {
  const width = useSyncExternalStore(subscribe, readWidth, readServer);
  const height = useSyncExternalStore(subscribe, readHeight, readServer);

  return useMemo(() => ({ height, width }), [height, width]);
};

export { useStageSize };
