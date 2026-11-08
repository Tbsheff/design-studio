import { useCallback, useState } from "react";

import type { PinOffset } from "./comment-placement.js";
import type { SelectionContext } from "./deps.js";

interface PickState {
  readonly offset?: PinOffset;
  readonly selection: SelectionContext;
}

interface CommentPick {
  readonly pick: SelectionContext | null;
  readonly pickOffset: PinOffset | undefined;
  readonly setPick: (
    selection: SelectionContext | null,
    offset?: PinOffset
  ) => void;
}

const usePick = (): CommentPick => {
  const [picked, setPicked] = useState<PickState | null>(null);

  const setPick = useCallback(
    (selection: SelectionContext | null, offset?: PinOffset): void => {
      if (!selection) {
        setPicked(null);

        return;
      }

      setPicked({ offset, selection });
    },
    []
  );

  return {
    pick: picked?.selection ?? null,
    pickOffset: picked?.offset,
    setPick,
  };
};

export { usePick };

export type { CommentPick };
