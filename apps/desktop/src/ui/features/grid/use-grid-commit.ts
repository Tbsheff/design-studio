import { useCallback, useTransition } from "react";

import { errorText } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import { writeGrid } from "./grid-api.js";
import type { GridIds } from "./grid-api.js";
import { toChange, toStyled } from "./grid-drag-model.js";
import type { GridDragLive } from "./grid-drag-model.js";

interface GridCommitHost {
  readonly onError: (message: string) => void;
  readonly refreshRects: () => void;
  readonly setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
}

interface GridCommitInput {
  readonly breakpoint: string;
  readonly host: GridCommitHost;
  readonly ids: GridIds;
  readonly onSaved: () => void;
}

const useGridCommit = ({
  breakpoint,
  host,
  ids,
  onSaved,
}: GridCommitInput): ((
  done: GridDragLive,
  selected: SelectionContext
) => void) => {
  const [, startTransition] = useTransition();
  const { onError, refreshRects, setSelection } = host;

  return useCallback(
    (done: GridDragLive, selected: SelectionContext): void => {
      startTransition(async () => {
        try {
          await writeGrid(ids, selected, breakpoint, toChange(done));
          setSelection((items) => toStyled(items, selected.selector, done));
          refreshRects();
          onSaved();
        } catch (error) {
          onError(errorText(error));
        }
      });
    },
    [breakpoint, ids, onError, onSaved, refreshRects, setSelection]
  );
};

export { useGridCommit };

export type { GridCommitHost, GridCommitInput };
