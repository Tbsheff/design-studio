import { useEffect, useState } from "react";

import { errorText } from "./deps.js";
import type { GridInfo, SourceLoc } from "./deps.js";
import { readGrid } from "./grid-api.js";
import type { GridIds } from "./grid-api.js";

interface GridLoad {
  readonly error: string | null;
  readonly info: GridInfo | null;
  readonly key: string;
}

const EMPTY: GridLoad = { error: null, info: null, key: "" };

const toKey = (
  ids: GridIds,
  source: SourceLoc | null,
  breakpoint: string,
  round: number
): string => {
  if (source === null) {
    return "";
  }

  return `${ids.projectId}/${ids.directionId}/${source.file}:${source.line}:${source.col}@${breakpoint}#${round}`;
};

const useGridInfo = (
  ids: GridIds,
  source: SourceLoc | null,
  breakpoint: string,
  round: number
): GridLoad => {
  const [state, setState] = useState<GridLoad>(EMPTY);
  const key = toKey(ids, source, breakpoint, round);

  useEffect(() => {
    if (source === null) {
      return;
    }

    const live = { current: true };

    const load = async (): Promise<void> => {
      try {
        const info = await readGrid(ids, source, breakpoint);

        if (live.current) {
          setState({ error: null, info, key });
        }
      } catch (error) {
        if (live.current) {
          setState({ error: errorText(error), info: null, key });
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

export { useGridInfo };

export type { GridLoad };
