import type { CompiledTokenEntry } from "@design-studio/contracts";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { findElement } from "./find-element.js";
import {
  filterEntries,
  toMovedIndex,
  toStartIndex,
} from "./token-picker-model.js";

interface TokenPickerInput {
  readonly current: string | null;
  readonly entries: CompiledTokenEntry[];
  readonly nearest: string | null;
  readonly onChoose: (entry: CompiledTokenEntry) => void;
}

interface TokenPickerState {
  readonly handleSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleSearchKeyDown: (
    event: KeyboardEvent<HTMLInputElement>
  ) => void;
  readonly id: string;
  readonly index: number;
  readonly bindInput: (node: HTMLInputElement | null) => void;
  readonly bindList: (node: HTMLUListElement | null) => void;
  readonly list: CompiledTokenEntry[];
  readonly query: string;
  readonly handleHover: (position: number) => void;
}

const useTokenPicker = (input: TokenPickerInput): TokenPickerState => {
  const { current, entries, nearest, onChoose } = input;
  const [query, setQuery] = useState("");
  const list = useMemo(() => filterEntries(entries, query), [entries, query]);

  const [active, setActive] = useState(() =>
    toStartIndex(entries, current, nearest)
  );

  const id = useId();
  const index = Math.min(active, Math.max(0, list.length - 1));
  const chosen = list[index];
  const listRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const bindInput = useCallback((node: HTMLInputElement | null): void => {
    inputRef.current = node;
  }, []);

  const bindList = useCallback((node: HTMLUListElement | null): void => {
    listRef.current = node;
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (listRef.current) {
      findElement(listRef.current, `[id="${id}-${index}"]`)?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [id, index]);

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      const next = toMovedIndex(event.key, index, list.length);

      if (next !== null) {
        event.preventDefault();
        setActive(next);

        return;
      }

      if (event.key === "Enter" && chosen) {
        event.preventDefault();
        onChoose(chosen);
      }
    },
    [chosen, index, list.length, onChoose]
  );

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setQuery(event.target.value);
      setActive(0);
    },
    []
  );

  const handleHover = setActive;

  return {
    bindInput,
    bindList,
    handleHover,
    handleSearchChange,
    handleSearchKeyDown,
    id,
    index,
    list,
    query,
  };
};

export { useTokenPicker };

export type { TokenPickerState };
