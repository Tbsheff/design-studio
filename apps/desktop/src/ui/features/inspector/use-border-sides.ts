import { useCallback, useMemo, useState } from "react";

import {
  isBorderSide,
  toBorderSide,
  toShownSide,
  toSidePatch,
  toSideWidths,
} from "./border-side-model.js";
import type { BorderSide } from "./border-side-model.js";
import type { DirectEdit } from "./deps.js";
import { applyEdit } from "./simple-model.js";

interface BorderSides {
  readonly side: BorderSide;
  readonly handleSidePick: (next: string) => void;
}

const useBorderSides = (edit: DirectEdit): BorderSides => {
  const [picked, setPicked] = useState<BorderSide | null>(null);

  const widths = useMemo(
    () => toSideWidths(edit.values, edit.dirty),
    [edit.values, edit.dirty]
  );

  const side = toShownSide(picked, toBorderSide(widths));

  const handleSidePick = useCallback(
    (next: string) => {
      if (!isBorderSide(next)) {
        return;
      }

      setPicked(next);
      const patch = toSidePatch(next, widths, edit.dirty);

      if (patch) {
        applyEdit(edit, patch);
      }
    },
    [edit, widths]
  );

  return { handleSidePick, side };
};

export { useBorderSides };

export type { BorderSides };
