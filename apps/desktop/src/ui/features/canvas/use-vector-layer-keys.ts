import { useEffect } from "react";

import { useLatestGetter } from "./use-latest-getter.js";
import { vectorTool } from "./vector-tool-model.js";
import type { VectorToolId } from "./vector-tool-model.js";

const stopEvent = (event: KeyboardEvent): void => {
  event.preventDefault();
  event.stopImmediatePropagation();
};

const useVectorLayerKeys = (
  tool: VectorToolId | null,
  onPenKey: (key: string) => boolean
): void => {
  const getPenKey = useLatestGetter(onPenKey);
  const isActive = tool !== null;
  const isPen = tool === "pen";

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (isPen && getPenKey()(event.key)) {
        stopEvent(event);

        return;
      }

      if (event.key === "Escape") {
        stopEvent(event);
        vectorTool.set(null);
      }
    };

    globalThis.addEventListener("keydown", onKey, true);

    return (): void => globalThis.removeEventListener("keydown", onKey, true);
  }, [isActive, isPen, getPenKey]);
};

export { useVectorLayerKeys };
