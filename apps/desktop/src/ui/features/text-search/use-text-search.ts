import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { copy, staleText, undoText } from "./copy.js";
import { api, IS_MAC, shortcutLabel } from "./deps.js";
import type { TextHit, TextSearchResult, TextUpdateResult } from "./deps.js";
import {
  DEFAULT_OPTIONS,
  isQueryReady,
  toGroups,
  toQuery,
} from "./text-search-model.js";
import type {
  HitGroup,
  OptionName,
  SearchOptions,
} from "./text-search-model.js";

interface TextSearchTarget {
  readonly directionId: string;
  readonly projectId: string;
}

interface TextSearchState {
  readonly activeId: string | null;
  readonly error: string | null;
  readonly groups: readonly HitGroup[];
  readonly isReplacing: boolean;
  readonly isSearching: boolean;
  readonly notice: string | null;
  readonly options: SearchOptions;
  readonly query: string;
  readonly replace: string;
  readonly replaceAll: () => void;
  readonly replaceOne: (hit: TextHit) => void;
  readonly result: TextSearchResult | null;
  readonly setActiveId: (id: string | null) => void;
  readonly setQuery: (query: string) => void;
  readonly setReplace: (replace: string) => void;
  readonly toggle: (name: OptionName) => void;
}

interface SearchRun {
  readonly error: string | null;
  readonly isSearching: boolean;
  readonly refresh: () => void;
  readonly result: TextSearchResult | null;
}

interface ReplaceRun {
  readonly error: string | null;
  readonly isReplacing: boolean;
  readonly notice: string | null;
  readonly run: (ids: readonly string[] | null) => void;
  readonly setNotice: (notice: string | null) => void;
}

interface ReplaceFields {
  readonly options: SearchOptions;
  readonly query: string;
  readonly replace: string;
}

const SEARCH_DELAY_MS = 200;

const messageOf = (error: Error): string => error.message || copy.failed;

const failureText = (error: Error | string): string => {
  if (error instanceof Error) {
    return messageOf(error);
  }

  return copy.failed;
};

const noticeOf = (done: TextUpdateResult): string => {
  const undo = undoText(done.updated, shortcutLabel("undo", IS_MAC));

  if (done.stale.length === 0) {
    return undo;
  }

  return `${undo} ${staleText(done.stale.length)}`;
};

const useSearchRun = (
  target: TextSearchTarget,
  query: string,
  options: SearchOptions
): SearchRun => {
  const [isSearching, startSearch] = useTransition();
  const [result, setResult] = useState<TextSearchResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const ticket = useRef(0);
  const { directionId, projectId } = target;
  const isReady = isQueryReady(query);

  const runSearch = useCallback((): void => {
    ticket.current += 1;
    const mine = ticket.current;

    startSearch(async () => {
      try {
        const found = await api.searchText(
          projectId,
          directionId,
          toQuery(query, options)
        );

        if (mine === ticket.current) {
          setResult(found);
          setProblem(null);
        }
      } catch (error) {
        if (mine === ticket.current) {
          setProblem(failureText(error as Error));
        }
      }
    });
  }, [directionId, options, projectId, query]);

  useEffect(() => {
    if (!isReady) {
      ticket.current += 1;

      return;
    }

    const timer = globalThis.setTimeout(runSearch, SEARCH_DELAY_MS);

    return (): void => {
      globalThis.clearTimeout(timer);
    };
  }, [isReady, runSearch]);

  const error = problem;

  if (!isReady) {
    return {
      error: null,
      isSearching: false,
      refresh: runSearch,
      result: null,
    };
  }

  const refresh = runSearch;

  return { error, isSearching, refresh, result };
};

const useReplaceRun = (
  target: TextSearchTarget,
  fields: ReplaceFields,
  refresh: () => void
): ReplaceRun => {
  const [isReplacing, startReplace] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const { directionId, projectId } = target;
  const { options, query, replace } = fields;

  const run = useCallback(
    (ids: readonly string[] | null): void => {
      startReplace(async () => {
        try {
          const done = await api.updateText(projectId, directionId, {
            ...toQuery(query, options),
            ids,
            replace,
          });

          setNotice(noticeOf(done));
          setProblem(null);
          refresh();
        } catch (error) {
          setProblem(failureText(error as Error));
        }
      });
    },
    [directionId, options, projectId, query, refresh, replace]
  );

  const error = problem;

  return { error, isReplacing, notice, run, setNotice };
};

const useTextSearch = (target: TextSearchTarget): TextSearchState => {
  const [queryText, setQueryText] = useState("");
  const query = queryText;
  const [replace, setReplace] = useState("");
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_OPTIONS);
  const [activeId, setActiveId] = useState<string | null>(null);

  const search = useSearchRun(target, query, options);

  const replaced = useReplaceRun(
    target,
    { options, query, replace },
    search.refresh
  );

  const groups = useMemo(
    () => toGroups(search.result?.hits ?? []),
    [search.result]
  );

  const { run, setNotice } = replaced;

  const toggle = useCallback((name: OptionName): void => {
    setOptions((current) => ({ ...current, [name]: !current[name] }));
  }, []);

  const replaceOne = useCallback((hit: TextHit): void => run([hit.id]), [run]);

  const replaceAll = useCallback((): void => run(null), [run]);

  const setQuery = useCallback(
    (next: string): void => {
      setQueryText(next);
      setNotice(null);
    },
    [setNotice]
  );

  const error = replaced.error ?? search.error;
  const { isReplacing, notice } = replaced;
  const { isSearching, result } = search;

  return {
    activeId,
    error,
    groups,
    isReplacing,
    isSearching,
    notice,
    options,
    query,
    replace,
    replaceAll,
    replaceOne,
    result,
    setActiveId,
    setQuery,
    setReplace,
    toggle,
  };
};

export { useTextSearch };

export type { TextSearchState, TextSearchTarget };
