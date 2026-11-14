import type { CanvasGuide } from "@design-studio/contracts/canvas-file";
import { useCallback } from "react";

import type { CanvasFrame } from "./canvas-layout-types.js";
import { snapLineStore } from "./frame-snap-store.js";
import { toLayerSnapLines } from "./layer-snap-lines-model.js";
import { useLayoutGridShown } from "./use-layout-grid.js";

type ReadLayerLines = (zoom: number) => readonly CanvasGuide[];

const useLayerSnapLines = (frame: CanvasFrame | null): ReadLayerLines => {
  const isGridShown = useLayoutGridShown();

  return useCallback(
    (zoom: number): readonly CanvasGuide[] => {
      const guides = snapLineStore.get();

      return toLayerSnapLines({ frame, guides, isGridShown, zoom });
    },
    [frame, isGridShown]
  );
};

export { useLayerSnapLines };

export type { ReadLayerLines };
