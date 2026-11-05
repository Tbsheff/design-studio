import { useCallback, useMemo, useState, useTransition } from "react";

import { errorText } from "./deps.js";
import type { GridInfo, GridSetResult, SelectionContext } from "./deps.js";
import { writeGrid, writeGridItem } from "./grid-api.js";
import type { GridChange, GridIds, GridItemChange } from "./grid-api.js";
import { useGridInfo } from "./use-grid-info.js";

interface Grid {
  readonly apply: (change: GridChange) => void;
  readonly applyItem: (change: GridItemChange) => void;
  readonly error: string | null;
  readonly info: GridInfo | null;
  readonly isPending: boolean;
}

const useGrid = (
  ids: GridIds,
  target: SelectionContext,
  breakpoint: string
): Grid => {
  const [round, setRound] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const load = useGridInfo(ids, target.source, breakpoint, round);

  const run = useCallback((write: () => Promise<GridSetResult>): void => {
    startTransition(async () => {
      try {
        await write();
        setSaveError(null);
      } catch (error) {
        setSaveError(errorText(error));
      }

      setRound((value) => value + 1);
    });
  }, []);

  const apply = useCallback(
    (change: GridChange): void => {
      run(() => writeGrid(ids, target, breakpoint, change));
    },
    [breakpoint, ids, run, target]
  );

  const applyItem = useCallback(
    (change: GridItemChange): void => {
      run(() => writeGridItem(ids, target, breakpoint, change));
    },
    [breakpoint, ids, run, target]
  );

  const error = saveError ?? load.error;
  const { info } = load;

  return useMemo(
    () => ({ apply, applyItem, error, info, isPending }),
    [apply, applyItem, error, info, isPending]
  );
};

export { useGrid };

export type { Grid };
