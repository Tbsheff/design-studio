import { useCallback } from "react";

import { noteRecent } from "./palette-model.js";
import type { Row } from "./palette-row-types.js";

const usePaletteRun = (
  isBusy: boolean,
  onClose: () => void
): ((row: Row) => void) =>
  useCallback(
    (row: Row): void => {
      if (row.disabled || isBusy) {
        return;
      }

      if (row.commandId) {
        noteRecent(row.commandId);
      }

      if (row.kind !== "command") {
        row.run();

        return;
      }

      onClose();
      globalThis.setTimeout(() => row.run(), 0);
    },
    [isBusy, onClose]
  );

export { usePaletteRun };
