import { useEffect, useState } from "react";

import { api, insertError } from "./deps.js";
import type { IconList } from "./deps.js";

type SearchState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly value: IconList };

interface SearchIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface Live {
  current: boolean;
}

const SEARCH_DELAY_MS = 150;
const SEARCH_LIMIT = 48;

const LOADING: SearchState = { status: "loading" };

const fetchIcons = async (
  ids: SearchIds,
  query: string
): Promise<SearchState> => {
  try {
    const value = await api.listIcons(ids.projectId, ids.directionId, {
      limit: SEARCH_LIMIT,
      query: query.trim(),
    });

    return { status: "ready", value };
  } catch (error) {
    return { message: insertError(error), status: "error" };
  }
};

const useIconSearch = (ids: SearchIds, query: string): SearchState => {
  const [state, setState] = useState<SearchState>(LOADING);

  useEffect(() => {
    const live: Live = { current: true };

    const load = async (): Promise<void> => {
      const next = await fetchIcons(ids, query);

      if (live.current) {
        setState(next);
      }
    };

    const timer = globalThis.setTimeout(() => {
      void load();
    }, SEARCH_DELAY_MS);

    return (): void => {
      live.current = false;
      globalThis.clearTimeout(timer);
    };
  }, [ids, query]);

  return state;
};

export { useIconSearch };

export type { SearchIds, SearchState };
