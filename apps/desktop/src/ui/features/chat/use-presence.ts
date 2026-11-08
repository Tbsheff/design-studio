import { useEffect, useState } from "react";

const CSS_DUR_EXIT_MS = 100;

const reducedMotion = (): boolean =>
  globalThis.window !== undefined &&
  globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

const usePresence = <Value>(
  value: Value | null
): {
  shown: Value | null;
  closing: boolean;
} => {
  const [kept, setKept] = useState<Value | null>(value);
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

    return (): void => globalThis.clearTimeout(timer);
  }, [value]);

  return { closing: value === null && kept !== null, shown: value ?? kept };
};

export { CSS_DUR_EXIT_MS, usePresence };
