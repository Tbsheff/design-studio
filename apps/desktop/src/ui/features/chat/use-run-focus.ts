import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useMemo, useState } from "react";

import type { FrameFocus } from "./run-focus-model.js";
import {
  toFocusWith,
  toFocusWithAll,
  toFocusWithSelection,
  toFocusWithout,
  toSelectionFocusPath,
} from "./run-focus-model.js";

interface RunFocus {
  readonly add: (path: string) => void;
  readonly addFrames: () => void;
  readonly clear: () => void;
  readonly frames: FrameFocus | null;
  readonly paths: string[];
  readonly remove: (path: string) => void;
  readonly sendPaths: string[];
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

  const sendPaths = useMemo(
    () => toFocusWithSelection(paths, selectionPath),
    [paths, selectionPath]
  );

  return {
    add,
    addFrames,
    clear,
    frames,
    paths,
    remove,
    sendPaths,
  };
};

export { useRunFocus };

export type { RunFocus };
