import { useCallback, useRef } from "react";
import type { RefObject } from "react";

import type { PassiveProps } from "./passive-frame-model.js";

type PassiveEntry = PassiveProps;

interface PassiveEntries {
  readonly entries: RefObject<Map<string, PassiveEntry>>;
  readonly reset: () => Map<string, PassiveEntry>;
}

const usePassiveEntries = (): PassiveEntries => {
  const entries = useRef(new Map<string, PassiveEntry>());

  const reset = useCallback((): Map<string, PassiveEntry> => {
    entries.current.clear();

    return entries.current;
  }, []);

  return { entries, reset };
};

export { usePassiveEntries };

export type { PassiveEntry };
