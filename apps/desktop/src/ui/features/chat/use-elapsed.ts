import { useEffect, useState } from "react";

const TICK_MS = 1000;

const useElapsed = (since: number, isActive: boolean): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let id: ReturnType<typeof globalThis.setTimeout> | null = null;

    const tick = (): void => {
      setNow(Date.now());
      id = globalThis.setTimeout(tick, TICK_MS);
    };

    id = globalThis.setTimeout(tick, TICK_MS);

    return (): void => {
      if (id !== null) {
        globalThis.clearTimeout(id);
      }
    };
  }, [isActive]);

  return Math.max(0, now - since);
};

export { useElapsed };
