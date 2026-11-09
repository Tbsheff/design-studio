import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useState } from "react";

import {
  toFocusWith,
  toFocusWithout,
  toSelectionFocusPath,
} from "./run-focus-model.js";

interface RunFocus {
  readonly add: (path: string) => void;
  readonly addSelection: () => void;
  readonly clear: () => void;
  readonly paths: string[];
  readonly remove: (path: string) => void;
  readonly selectionPath: string | null;
}

const useRunFocus = (selection: readonly SelectionContext[]): RunFocus => {
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

  const clear = useCallback((): void => setPaths([]), []);

  const remove = useCallback(
    (path: string): void => setPaths((prev) => toFocusWithout(prev, path)),
    []
  );

  return { add, addSelection, clear, paths, remove, selectionPath };
};

export { useRunFocus };

export type { RunFocus };
