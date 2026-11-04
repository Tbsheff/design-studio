import { useCallback, useEffect, useMemo, useState } from "react";

import { api, insertError } from "./deps.js";
import type { TextStyle } from "./deps.js";

interface TextStyleIds {
  readonly directionId: string;
  readonly projectId: string;
}

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly styles: TextStyle[] };

interface StyleList {
  reload: () => void;
  state: ListState;
}

interface Live {
  current: boolean;
}

const LOADING: ListState = { status: "loading" };

const fetchStyles = async (ids: TextStyleIds): Promise<ListState> => {
  try {
    const list = await api.listTextStyles(ids.projectId, ids.directionId);

    return { status: "ready", styles: list.styles };
  } catch (error) {
    return { message: insertError(error), status: "error" };
  }
};

const useStyleList = (ids: TextStyleIds): StyleList => {
  const [state, setState] = useState<ListState>(LOADING);
  const [round, setRound] = useState(0);
  const key = useMemo(() => ({ ...ids, round }), [ids, round]);

  useEffect(() => {
    const live: Live = { current: true };

    const load = async (): Promise<void> => {
      const next = await fetchStyles(key);

      if (live.current) {
        setState(next);
      }
    };

    void load();

    return (): void => {
      live.current = false;
    };
  }, [key]);

  const reload = useCallback((): void => {
    setRound((count) => count + 1);
  }, []);

  return { reload, state };
};

const stylesOf = (state: ListState): TextStyle[] => {
  if (state.status === "ready") {
    return state.styles;
  }

  return [];
};

export { stylesOf, useStyleList };

export type { ListState, TextStyleIds };
