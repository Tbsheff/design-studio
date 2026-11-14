import { routes } from "@design-studio/actions/font/routes";
import { useCallback, useMemo, useState } from "react";

import { useAction } from "../../platform/query.js";
import type { DirectEdit } from "./deps.js";
import { NO_ROW, toFilteredRows, toOrderedRows } from "./font-list-model.js";
import type { FontRow } from "./font-list-model.js";

interface FontMenu {
  readonly active: number;
  readonly all: readonly FontRow[];
  readonly close: () => void;
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly rows: readonly FontRow[];
  readonly setActive: (index: number) => void;
  readonly setQuery: (query: string) => void;
}

const PAGE_LIMIT = 200;

const NO_ROWS: readonly FontRow[] = [];

const useFontList = (
  projectId: string,
  directionId: string | null,
  isWanted: boolean
): readonly FontRow[] => {
  const input = useMemo(() => {
    if (directionId === null || !isWanted) {
      return null;
    }

    const cursor = null;
    const limit = PAGE_LIMIT;

    return { cursor, directionId, limit, projectId };
  }, [directionId, isWanted, projectId]);

  const found = useAction(routes.listFont, input);

  return found.data?.items ?? NO_ROWS;
};

const useFontMenu = (edit: DirectEdit): FontMenu => {
  const [isOpen, setIsOpen] = useState(false);
  const [isWanted, setIsWanted] = useState(false);
  const [active, setActive] = useState(NO_ROW);
  const [query, setQuery] = useState("");
  const { directionId, projectId } = edit.scope;
  const all = useFontList(projectId, directionId, isWanted);

  const rows = useMemo(
    () => toOrderedRows(toFilteredRows(all, query)),
    [all, query]
  );

  const open = useCallback((): void => {
    setIsWanted(true);
    setIsOpen(true);
  }, []);

  const close = useCallback((): void => {
    setIsOpen(false);
    setActive(NO_ROW);
    setQuery("");
  }, []);

  return { active, all, close, isOpen, open, rows, setActive, setQuery };
};

export { useFontMenu };

export type { FontMenu };
