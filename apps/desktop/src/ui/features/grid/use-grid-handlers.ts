import { useCallback, useMemo } from "react";

import { toLineValue } from "./grid-model.js";
import type { GridAxis, LineKey } from "./grid-model.js";
import type { Grid } from "./use-grid.js";

interface GridHandlers {
  readonly handleLine: (field: LineKey, raw: string) => void;
  readonly handleMake: () => void;
  readonly handleTracks: (axis: GridAxis, text: string | null) => void;
}

const useGridHandlers = (grid: Grid): GridHandlers => {
  const { apply, applyItem } = grid;

  const handleTracks = useCallback(
    (axis: GridAxis, text: string | null): void => {
      if (axis === "columns") {
        apply({ columns: text });

        return;
      }

      apply({ rows: text });
    },
    [apply]
  );

  const handleMake = useCallback((): void => {
    apply({ display: "grid" });
  }, [apply]);

  const handleLine = useCallback(
    (field: LineKey, raw: string): void => {
      const value = toLineValue(raw);

      if (value === "invalid") {
        return;
      }

      applyItem({ [field]: value });
    },
    [applyItem]
  );

  return useMemo(
    () => ({ handleLine, handleMake, handleTracks }),
    [handleLine, handleMake, handleTracks]
  );
};

export { useGridHandlers };

export type { GridHandlers };
