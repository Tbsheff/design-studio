import { useEffect, useState } from "react";

import { readReaderLines } from "./accessibility-api.js";
import type { AccessibilityIds } from "./accessibility-api.js";
import { insertError } from "./deps.js";
import type { ReaderLine } from "./reader-model.js";

interface ReaderLoad {
  readonly error: string | null;
  readonly isLoaded: boolean;
  readonly lines: readonly ReaderLine[];
}

interface ReaderLoadState extends ReaderLoad {
  readonly loadKey: string;
}

const NO_LINES: readonly ReaderLine[] = [];

const EMPTY: ReaderLoadState = {
  error: null,
  isLoaded: false,
  lines: NO_LINES,
  loadKey: "",
};

const toLoadKey = (
  ids: AccessibilityIds,
  frameId: string,
  round: string
): string => `${ids.projectId}/${ids.directionId}/${frameId}#${round}`;

const useReaderLines = (
  ids: AccessibilityIds,
  frameId: string,
  round: string
): ReaderLoad => {
  const [state, setState] = useState<ReaderLoadState>(EMPTY);
  const key = toLoadKey(ids, frameId, round);

  useEffect(() => {
    const live = { current: true };

    const load = async (): Promise<void> => {
      try {
        const found = await readReaderLines(ids, frameId);

        if (live.current) {
          setState({ error: null, isLoaded: true, lines: found, loadKey: key });
        }
      } catch (error) {
        if (live.current) {
          setState({
            error: insertError(error),
            isLoaded: true,
            lines: NO_LINES,
            loadKey: key,
          });
        }
      }
    };

    void load();

    return (): void => {
      live.current = false;
    };
  }, [frameId, ids, key]);

  if (state.loadKey === key) {
    return state;
  }

  return { ...state, isLoaded: false };
};

export { useReaderLines };

export type { ReaderLoad };
