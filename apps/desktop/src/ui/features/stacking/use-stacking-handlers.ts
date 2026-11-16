import { useCallback, useMemo } from "react";

import type { StackingSide } from "./deps.js";
import { cleanOffset, positionEdit, snapZ } from "./stacking-model.js";
import type { Stacking } from "./use-stacking.js";

interface StackingHandlers {
  readonly handleInset: (side: StackingSide, raw: string) => void;
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

  const handleZIndex = useCallback(
    (raw: string): void => {
      apply({ zIndex: snapZ(raw) });
    },
    [apply]
  );

  return useMemo(
    () => ({ handleInset, handlePosition, handleZIndex }),
    [handleInset, handlePosition, handleZIndex]
  );
};

export { useStackingHandlers };

export type { StackingHandlers };
