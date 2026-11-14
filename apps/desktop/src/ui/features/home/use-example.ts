import { useEffect, useState } from "react";

import { EXAMPLE_MS } from "./home-model.js";

const useExample = (examples: readonly string[], isPaused: boolean): string => {
  const [index, setIndex] = useState(0);
  const count = examples.length;
  useEffect(() => {
    if (isPaused || count < 2) {
      return;
    }

    const timer = globalThis.setTimeout(
      () => setIndex((index + 1) % count),
      EXAMPLE_MS
    );

    return (): void => globalThis.clearTimeout(timer);
  }, [isPaused, count, index]);

  return examples[index % Math.max(count, 1)] ?? "";
};

export { useExample };
