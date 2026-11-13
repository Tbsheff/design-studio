import { useMemo } from "react";
import type { RefObject } from "react";

import { toFrameMenuRows } from "./frame-menu-groups-model.js";
import type {
  FrameMenuEntry,
  FrameMenuRow,
} from "./frame-menu-groups-model.js";
import {
  useCopyPngEntry,
  useRedesignEntry,
  useScreenEntry,
  useTidyEntry,
} from "./frame-menu-model.js";

interface FrameMenuRowsInput {
  readonly own: readonly FrameMenuEntry[];
  readonly path: string | null;
  readonly port: FrameMenuEntry | null;
  readonly root: RefObject<HTMLDivElement | null>;
}

const useFrameMenuRows = (
  input: FrameMenuRowsInput
): readonly FrameMenuRow[] => {
  const { own, path, port, root } = input;
  const screenEntry = useScreenEntry(root);
  const copyPngEntry = useCopyPngEntry(root);
  const redesignEntry = useRedesignEntry(path);
  const tidyEntry = useTidyEntry(root);

  return useMemo(() => {
    const entries: FrameMenuEntry[] = [screenEntry, copyPngEntry, tidyEntry];

    if (port) {
      entries.push(port);
    }

    if (redesignEntry) {
      entries.push(redesignEntry);
    }

    return toFrameMenuRows([...entries, ...own]);
  }, [copyPngEntry, own, port, redesignEntry, screenEntry, tidyEntry]);
};

export { useFrameMenuRows };

export type { FrameMenuRowsInput };
