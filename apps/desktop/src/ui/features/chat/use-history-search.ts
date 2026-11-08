import { useCallback, useMemo, useState } from "react";

import { fuzzyRank } from "../../../shared/fuzzy.js";

const MAX_HITS = 20;

interface HistorySearchState {
  readonly changeQuery: (next: string) => void;
  readonly close: () => void;
  readonly current: string | null;
  readonly move: (step: 1 | -1) => void;
  readonly open: boolean;
  readonly query: string;
  readonly shown: string[];
  readonly start: () => void;
}

const useHistorySearch = (history: readonly string[]): HistorySearchState => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const shown = useMemo(
    () =>
      fuzzyRank([...history].toReversed(), query, (prompt) => prompt, MAX_HITS),
    [history, query]
  );

  const current =
    shown[Math.min(active, Math.max(0, shown.length - 1))] ?? null;

  const close = useCallback(() => setOpen(false), []);

  const changeQuery = useCallback((next: string) => {
    setQuery(next);
    setActive(0);
  }, []);

  const move = useCallback(
    (step: 1 | -1) =>
      setActive((index) => {
        if (shown.length === 0) {
          return 0;
        }

        return (index + step + shown.length) % shown.length;
      }),
    [shown.length]
  );

  const start = useCallback(() => {
    changeQuery("");
    setOpen(true);
  }, [changeQuery]);

  return {
    changeQuery,
    close,
    current,
    move,
    open,
    query,
    shown,
    start,
  };
};

export { useHistorySearch };

export type { HistorySearchState };
