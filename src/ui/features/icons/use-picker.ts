import { useCallback, useMemo } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";

import { copy } from "./copy.js";
import {
  ICON_COLOR,
  ICON_SIZE_DEFAULT,
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
} from "./deps.js";
import type { IconSummary } from "./deps.js";
import { nextIndex } from "./grid-keys.js";
import { useIconInsert } from "./use-icon-insert.js";
import type { InsertSetup, InsertState } from "./use-icon-insert.js";
import { useIconSearch } from "./use-icon-search.js";
import type { SearchState } from "./use-icon-search.js";
import { usePickerFields } from "./use-picker-fields.js";

interface Picker {
  readonly active: number;
  readonly color: string;
  readonly colorProblem: string | null;
  readonly handleColor: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handlePick: (index: number) => void;
  readonly handleQuery: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleSearchKey: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleSize: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly icons: readonly IconSummary[];
  readonly insert: InsertState;
  readonly query: string;
  readonly size: string;
  readonly state: SearchState;
}

const NO_ICONS: readonly IconSummary[] = [];

const clampSize = (raw: string): number => {
  const value = Math.trunc(Number(raw));

  if (!Number.isFinite(value) || raw === "") {
    return ICON_SIZE_DEFAULT;
  }

  return Math.min(ICON_SIZE_MAX, Math.max(ICON_SIZE_MIN, value));
};

const problemOf = (color: string): string | null => {
  if (color === "" || ICON_COLOR.test(color)) {
    return null;
  }

  return copy.colorProblem;
};

const iconsOf = (state: SearchState): readonly IconSummary[] => {
  if (state.status === "ready") {
    return state.value.icons;
  }

  return NO_ICONS;
};

const usePicker = (setup: InsertSetup): Picker => {
  const fields = usePickerFields();
  const { active, color, setActive, size } = fields;
  const state = useIconSearch(setup.ids, fields.query);
  const insert = useIconInsert(setup);
  const icons = iconsOf(state);
  const colorProblem = problemOf(color);
  const { busy, run } = insert;

  const handleSearchKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      const next = nextIndex(event.key, active, icons.length);

      if (next !== null) {
        event.preventDefault();
        setActive(next);
      }
    },
    [active, icons.length, setActive]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const icon = icons[active];

      if (!icon || busy || colorProblem) {
        return;
      }

      void run({
        color,
        library: icon.library,
        name: icon.name,
        size: clampSize(size),
      });
    },
    [active, busy, color, colorProblem, icons, run, size]
  );

  return useMemo(
    () => ({
      ...fields,
      colorProblem,
      handlePick: setActive,
      handleSearchKey,
      handleSubmit,
      icons,
      insert,
      state,
    }),
    [
      colorProblem,
      fields,
      handleSearchKey,
      handleSubmit,
      icons,
      insert,
      setActive,
      state,
    ]
  );
};

export { usePicker };

export type { Picker };
