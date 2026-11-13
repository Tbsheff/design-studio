import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useState } from "react";

import type { FrameFocus } from "./run-focus-model.js";
import {
  toFocusWith,
  toFocusWithAll,
  toFocusWithout,
  toSelectionFocusPath,
} from "./run-focus-model.js";

interface RunFocus {
  readonly add: (path: string) => void;
  readonly addFrames: () => void;
  readonly addSelection: () => void;
  readonly clear: () => void;
  readonly frames: FrameFocus | null;
  readonly paths: string[];
  readonly remove: (path: string) => void;
  readonly selectionPath: string | null;
}

const useRunFocus = (
  selection: readonly SelectionContext[],
  frames: FrameFocus | null
): RunFocus => {
  const [paths, setPaths] = useState<string[]>([]);
  const selectionPath = toSelectionFocusPath(selection);

  const add = useCallback(
    (path: string): void => setPaths((prev) => toFocusWith(prev, path)),
    []
  );

  const addSelection = useCallback((): void => {
    if (selectionPath !== null) {
      setPaths((prev) => toFocusWith(prev, selectionPath));
    }
  }, [selectionPath]);

  const addFrames = useCallback((): void => {
    if (frames !== null) {
      setPaths((prev) => toFocusWithAll(prev, frames.files));
    }
  }, [frames]);

  const clear = useCallback((): void => setPaths([]), []);

  const remove = useCallback(
    (path: string): void => setPaths((prev) => toFocusWithout(prev, path)),
    []
  );

  return {
    add,
    addFrames,
    addSelection,
    clear,
    frames,
    paths,
    remove,
    selectionPath,
  };
};

export { useRunFocus };

export type { RunFocus };
