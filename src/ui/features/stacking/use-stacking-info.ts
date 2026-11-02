import { useEffect, useState } from "react";

import { insertError } from "./deps.js";
import type { SourceLoc, StackingInfo } from "./deps.js";
import { readStacking } from "./stacking-api.js";
import type { StackingIds } from "./stacking-api.js";

interface StackingLoad {
  readonly error: string | null;
  readonly info: StackingInfo | null;
  readonly key: string;
}

const EMPTY: StackingLoad = { error: null, info: null, key: "" };

const keyOf = (
  ids: StackingIds,
  source: SourceLoc | null,
  breakpoint: string,
  round: number
): string => {
  if (source === null) {
    return "";
  }

  return `${ids.projectId}/${ids.directionId}/${source.file}:${source.line}:${source.col}@${breakpoint}#${round}`;
};

const useStackingInfo = (
  ids: StackingIds,
  source: SourceLoc | null,
  breakpoint: string,
  round: number
): StackingLoad => {
  const [state, setState] = useState<StackingLoad>(EMPTY);
  const key = keyOf(ids, source, breakpoint, round);

  useEffect(() => {
    if (source === null) {
      return;
    }

    const live = { current: true };

    const load = async (): Promise<void> => {
      try {
        const info = await readStacking(ids, source, breakpoint);

        if (live.current) {
          setState({ error: null, info, key });
        }
      } catch (error) {
        if (live.current) {
          setState({ error: insertError(error), info: null, key });
        }
      }
    };

    void load();

    return (): void => {
      live.current = false;
    };
  }, [breakpoint, ids, key, source]);

  if (state.key === key) {
    return state;
  }

  return { ...EMPTY, info: state.info };
};

export { useStackingInfo };

export type { StackingLoad };
