import { useEffect, useState } from "react";

export const CSS_DUR_EXIT_MS = 100;

const reducedMotion = (): boolean =>
  globalThis.window !== undefined &&
  globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const usePresence = <T>(
  value: T | null
): {
  shown: T | null;
  closing: boolean;
} => {
  const [kept, setKept] = useState<T | null>(value);
  useEffect(() => {
    if (value !== null) {
      setKept(value);

      return;
    }

    if (reducedMotion()) {
      setKept(null);

      return;
    }

    const timer = globalThis.setTimeout(() => setKept(null), CSS_DUR_EXIT_MS);

    return () => globalThis.clearTimeout(timer);
  }, [value]);

  return { closing: value === null && kept !== null, shown: value ?? kept };
};
