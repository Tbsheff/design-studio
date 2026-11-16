import { useCallback, useState } from "react";

import type { FrameFocus } from "./run-focus-model.js";
import {
  toFocusWith,
  toFocusWithAll,
  toFocusWithout,
} from "./run-focus-model.js";

interface RunFocus {
  readonly add: (path: string) => void;
  readonly addFrames: () => void;
  readonly clear: () => void;
  readonly frames: FrameFocus | null;
  readonly paths: string[];
  readonly remove: (path: string) => void;
}

const useRunFocus = (frames: FrameFocus | null): RunFocus => {
  const [paths, setPaths] = useState<string[]>([]);

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

  return {
    add,
    addFrames,
    clear,
    frames,
    paths,
    remove,
  };
};

export { useRunFocus };

export type { RunFocus };
