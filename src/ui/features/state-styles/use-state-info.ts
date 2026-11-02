import { useEffect, useState } from "react";

import { insertError } from "./deps.js";
import type { SelectionContext, StateListResult } from "./deps.js";
import { listStates } from "./state-styles-api.js";
import type { StateIds } from "./state-styles-api.js";

interface StateInfo {
  readonly error: string | null;
  readonly info: StateListResult | null;
  readonly key: string;
}

const EMPTY: StateInfo = { error: null, info: null, key: "" };

const keyOf = (
  ids: StateIds,
  source: SelectionContext["source"],
  round: number
): string => {
  if (!source) {
    return "";
  }

  return `${ids.projectId}/${ids.directionId}/${source.file}:${source.line}:${source.col}#${round}`;
};

const useStateInfo = (
  ids: StateIds,
  source: SelectionContext["source"],
  round: number
): StateInfo => {
  const [state, setState] = useState<StateInfo>(EMPTY);
  const key = keyOf(ids, source, round);

  useEffect(() => {
    if (!source) {
      return;
    }

    const live = { current: true };

    const load = async (): Promise<void> => {
      try {
        const info = await listStates(ids, source);

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
  }, [ids, key, source]);

  if (state.key === key) {
    return state;
  }

  return { ...EMPTY, info: state.info };
};

export { useStateInfo };
