import { useEffect, useState } from "react";

import { EXAMPLES, EXAMPLE_MS, PLACEHOLDER } from "./home-model.js";

const useExample = (paused: boolean, fixed: boolean): string => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (paused || fixed) {
      return;
    }

    const timer = globalThis.setTimeout(
      () => setIndex((index + 1) % EXAMPLES.length),
      EXAMPLE_MS
    );

    return (): void => globalThis.clearTimeout(timer);
  }, [paused, fixed, index]);

  if (fixed) {
    return PLACEHOLDER;
  }

  return EXAMPLES[index] ?? "";
};

export { useExample };
