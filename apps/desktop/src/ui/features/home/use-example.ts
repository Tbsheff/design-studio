import { useEffect, useState } from "react";

import { EXAMPLES, EXAMPLE_MS, PLACEHOLDER } from "./home-model.js";

function useExample(paused: boolean, fixed: boolean): string {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (paused || fixed) {
      return;
    }

    const timer = globalThis.setInterval(
      () => setIndex((n) => (n + 1) % EXAMPLES.length),
      EXAMPLE_MS
    );

    return (): void => globalThis.clearInterval(timer);
  }, [paused, fixed]);

  return fixed ? PLACEHOLDER : (EXAMPLES[index] ?? "");
}

export { useExample };
