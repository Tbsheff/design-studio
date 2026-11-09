import type { LayerNode } from "@design-studio/contracts";
import { useCallback, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { toLayerSearch, toNextMatch } from "./layer-search-model.js";
import { visibleRows } from "./layers-tree.js";

interface LayerSearchInput {
  readonly collapsed: ReadonlySet<number>;
  readonly nodes: LayerNode[];
  readonly onEscape: () => void;
  readonly onSelect: (id: number, isAdditive: boolean) => void;
}

interface LayerSearchView {
  readonly dimmed: ReadonlySet<number>;
  readonly rows: LayerNode[];
  readonly shown: ReadonlySet<number>;
}

interface LayerSearchApi {
  readonly clear: () => void;
  readonly count: number;
  readonly dismiss: () => void;
  readonly focus: () => void;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly isActive: boolean;
  readonly query: string;
  readonly selectActive: () => void;
  readonly setQuery: (value: string) => void;
  readonly step: (delta: 1 | -1) => void;
  readonly view: LayerSearchView;
}

interface SearchState {
  readonly active: number;
  readonly query: string;
}

const NO_IDS: ReadonlySet<number> = new Set<number>();
const NO_MATCHES: readonly number[] = [];
const START: SearchState = { active: 0, query: "" };

const useLayerSearch = (input: LayerSearchInput): LayerSearchApi => {
  const { collapsed, nodes, onEscape, onSelect } = input;
  const [state, setState] = useState<SearchState>(START);
  const { active, query } = state;
  const inputRef = useRef<HTMLInputElement>(null);
  const result = useMemo(() => toLayerSearch(nodes, query), [nodes, query]);
  const matches = useMemo(() => result?.matches ?? NO_MATCHES, [result]);

  const view = useMemo((): LayerSearchView => {
    if (result) {
      return { dimmed: result.dimmed, rows: result.rows, shown: NO_IDS };
    }

    return {
      dimmed: NO_IDS,
      rows: visibleRows(nodes, collapsed),
      shown: collapsed,
    };
  }, [collapsed, nodes, result]);

  const setQuery = useCallback((value: string): void => {
    setState({ active: 0, query: value });
  }, []);

  const clear = useCallback((): void => {
    setState(START);
  }, []);

  const dismiss = useCallback((): void => {
    if (query === "") {
      onEscape();
    } else {
      setState(START);
    }
  }, [onEscape, query]);

  const focus = useCallback((): void => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const selectActive = useCallback((): void => {
    const id = matches[active] ?? null;

    if (id !== null) {
      onSelect(id, false);
    }
  }, [active, matches, onSelect]);

  const step = useCallback(
    (delta: 1 | -1): void => {
      const next = toNextMatch(matches.length, active, delta);
      const id = matches[next] ?? null;

      setState({ active: next, query });

      if (id !== null) {
        onSelect(id, false);
      }
    },
    [active, matches, onSelect, query]
  );

  const count = matches.length;
  const isActive = result !== null;

  return {
    clear,
    count,
    dismiss,
    focus,
    inputRef,
    isActive,
    query,
    selectActive,
    setQuery,
    step,
    view,
  };
};

export { useLayerSearch };

export type { LayerSearchApi };
