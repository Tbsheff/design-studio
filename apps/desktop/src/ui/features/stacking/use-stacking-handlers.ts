import { useCallback, useMemo } from "react";

import type { StackingSide } from "./deps.js";
import { cleanOffset, positionEdit, snapZ } from "./stacking-model.js";
import type { OverflowAxis } from "./stacking-model.js";
import type { Stacking } from "./use-stacking.js";

interface StackingHandlers {
  readonly handleInset: (side: StackingSide, raw: string) => void;
  readonly handleOverflow: (axis: OverflowAxis, next: string | null) => void;
  readonly handlePosition: (next: string) => void;
  readonly handleZIndex: (raw: string) => void;
}

const useStackingHandlers = (stacking: Stacking): StackingHandlers => {
  const { apply, info } = stacking;

  const handlePosition = useCallback(
    (next: string): void => {
      apply(positionEdit(next, info));
    },
    [apply, info]
  );

  const handleInset = useCallback(
    (side: StackingSide, raw: string): void => {
      apply({ [side]: cleanOffset(raw) });
    },
    [apply]
  );

  const handleOverflow = useCallback(
    (axis: OverflowAxis, next: string | null): void => {
      apply({ [axis]: next });
    },
    [apply]
  );

  const handleZIndex = useCallback(
    (raw: string): void => {
      apply({ zIndex: snapZ(raw) });
    },
    [apply]
  );

  return useMemo(
    () => ({ handleInset, handleOverflow, handlePosition, handleZIndex }),
    [handleInset, handleOverflow, handlePosition, handleZIndex]
  );
};

export { useStackingHandlers };

export type { StackingHandlers };
