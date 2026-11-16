import { useCallback } from "react";

import { frameName } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";

const useFrameNameOf = (
  frames: readonly CanvasFrame[]
): ((id: string) => string) =>
  useCallback(
    (id: string): string => {
      const found = frames.find((item) => item.id === id);

      if (found) {
        return frameName(found);
      }

      return id;
    },
    [frames]
  );

export { useFrameNameOf };
