import { useCallback } from "react";
import type { RefObject } from "react";

import type { PendingMap } from "./token-draft.js";

const useTokenLeave = (
  pendingRef: RefObject<PendingMap>,
  reset: () => void,
  confirmDiscard: (count: number) => boolean
): (() => boolean) =>
  useCallback((): boolean => {
    const count = Object.keys(pendingRef.current).length;

    if (count === 0) {
      return true;
    }

    const isConfirmed = confirmDiscard(count);

    if (isConfirmed) {
      reset();
    }

    return isConfirmed;
  }, [confirmDiscard, pendingRef, reset]);

export { useTokenLeave };
