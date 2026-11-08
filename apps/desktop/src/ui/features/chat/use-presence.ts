import { useEffect, useState } from "react";

const CSS_DUR_EXIT_MS = 100;

const reducedMotion = (): boolean =>
  "window" in globalThis &&
  globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Presence<Value> {
  shown: Value | null;
  closing: boolean;
}

const toKeepDelay = (isOpen: boolean): number => {
  if (isOpen || reducedMotion()) {
    return 0;
  }

  return CSS_DUR_EXIT_MS;
};

const usePresence = <Value>(value: Value | null): Presence<Value> => {
  const [kept, setKept] = useState<Value | null>(value);
  useEffect(() => {
    const timer = globalThis.setTimeout(
      () => setKept(value),
      toKeepDelay(value !== null)
    );

    return (): void => globalThis.clearTimeout(timer);
  }, [value]);

  return { closing: value === null && kept !== null, shown: value ?? kept };
};

export { CSS_DUR_EXIT_MS, usePresence };

export type { Presence };
