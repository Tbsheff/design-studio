import { useEffect, useState } from "react";

import { api, insertError } from "./deps.js";
import type { FillInfo, SelectionContext } from "./deps.js";

interface FillIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface FillInfoState {
  readonly error: string | null;
  readonly info: FillInfo | null;
  readonly key: string;
}

const EMPTY: FillInfoState = { error: null, info: null, key: "" };

const keyOf = (
  ids: FillIds,
  source: SelectionContext["source"],
  round: number,
  variant: string
): string => {
  if (!source) {
    return "";
  }

  return `${ids.projectId}/${ids.directionId}/${source.file}:${source.line}:${source.col}#${round}|${variant}`;
};

const currentOf = (state: FillInfoState, key: string): FillInfoState => {
  if (state.key === key) {
    return state;
  }

  return EMPTY;
};

const useFillInfo = (
  ids: FillIds,
  source: SelectionContext["source"],
  round: number,
  variant: string
): FillInfoState & { readonly loading: boolean } => {
  const [state, setState] = useState<FillInfoState>(EMPTY);
  const key = keyOf(ids, source, round, variant);

  useEffect(() => {
    if (!source) {
      return;
    }

    const live = { current: true };

    const load = async (): Promise<void> => {
      try {
        const info = await api.getFill(
          ids.projectId,
          ids.directionId,
          source,
          variant
        );

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
  }, [ids.directionId, ids.projectId, key, source, variant]);

  const current = currentOf(state, key);

  return { ...current, loading: Boolean(source) && state.key !== key };
};

export { useFillInfo };

export type { FillIds };
