import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";

import { varName } from "../../../shared/token-match.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import {
  NO_ROW,
  isLoadedFont,
  toFontKey,
  toNextActive,
} from "./font-list-model.js";
import type { FontKey, FontRow } from "./font-list-model.js";
import { useFontMenu } from "./use-font-list.js";
import type { FontMenu } from "./use-font-list.js";
import { useFontPreview } from "./use-font-preview.js";
import type { FontPreview } from "./use-font-preview.js";
import type { TokenUi } from "./use-token-snap.js";

const PROP = "font-family";

interface FontFieldState {
  readonly active: number;
  readonly failed: ReadonlySet<string>;
  readonly handleBlur: () => void;
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleClick: (event: MouseEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handlePick: (row: FontRow) => void;
  readonly isMixed: boolean;
  readonly isOpen: boolean;
  readonly rows: readonly FontRow[];
  readonly shownText: string;
  readonly tip: string;
}

interface FontActions {
  readonly cancel: () => void;
  readonly pick: (row: FontRow) => void;
  readonly settle: () => void;
  readonly step: (key: FontKey) => void;
}

const toFirstFamily = (value: string): string =>
  value
    .split(",")[0]
    ?.replaceAll(/^["']|["']$/gu, "")
    .trim() ?? "";

const toShownFont = (
  text: string | null,
  value: string,
  ui: TokenUi | null
): string => {
  if (text !== null) {
    return text;
  }

  if (ui && varName(value)) {
    return value;
  }

  return toFirstFamily(value);
};

const toTip = (value: string, rows: readonly FontRow[]): string => {
  if (isLoadedFont(value, rows)) {
    return value;
  }

  return `${copy.fontNotLoaded} ${value}`;
};

const useFontActions = (
  edit: DirectEdit,
  menu: FontMenu,
  fontPreview: FontPreview,
  setText: (text: string | null) => void
): FontActions => {
  const { active, close, rows, setActive } = menu;
  const { show } = fontPreview;

  const settle = useCallback((): void => {
    setText(null);
    close();
    edit.commit();
  }, [close, edit, setText]);

  const cancel = useCallback((): void => {
    setText(null);
    close();
    show(null);
    edit.revert([PROP]);
  }, [close, edit, setText, show]);

  const pick = useCallback(
    (row: FontRow): void => {
      show(row);
      edit.preview({ [PROP]: row.stack });
      settle();
    },
    [edit, settle, show]
  );

  const step = useCallback(
    (key: FontKey): void => {
      const next = toNextActive(active, key, rows.length);
      const row = rows[next] ?? null;

      setActive(next);

      if (row !== null) {
        setText(row.family);
        show(row);
        edit.preview({ [PROP]: row.preview });
      }
    },
    [active, edit, rows, setActive, setText, show]
  );

  return { cancel, pick, settle, step };
};

const useFontKeys = (
  menu: FontMenu,
  actions: FontActions
): ((event: KeyboardEvent<HTMLInputElement>) => void) => {
  const { active, isOpen, open, rows } = menu;
  const { cancel, pick, settle, step } = actions;
  const activeRow = rows[active] ?? null;

  return useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      const key = toFontKey(event.key, isOpen);

      if (key === "none") {
        return;
      }

      event.preventDefault();

      if (key === "close") {
        event.stopPropagation();
        cancel();
      } else if (key === "pick" && activeRow !== null) {
        pick(activeRow);
      } else if (key === "pick") {
        settle();
      } else if (isOpen) {
        step(key);
      } else {
        open();
      }
    },
    [activeRow, cancel, isOpen, open, pick, settle, step]
  );
};

const useFontField = (ui: TokenUi | null, edit: DirectEdit): FontFieldState => {
  const [text, setText] = useState<string | null>(null);
  const menu = useFontMenu(edit);
  const fontPreview = useFontPreview(edit, menu.isOpen);
  const actions = useFontActions(edit, menu, fontPreview, setText);
  const handleKeyDown = useFontKeys(menu, actions);
  const { active, all, open, rows, setActive, setQuery } = menu;
  const { cancel, settle } = actions;
  const isRowActive = active >= 0 && active < rows.length;

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const typed = event.target.value;

      setText(typed);
      setQuery(typed);
      setActive(NO_ROW);
      open();

      if (typed.trim()) {
        edit.preview({ [PROP]: typed.trim() });
      }
    },
    [edit, open, setActive, setQuery]
  );

  const handleBlur = useCallback((): void => {
    if (isRowActive) {
      cancel();

      return;
    }

    settle();
  }, [cancel, isRowActive, settle]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLInputElement>): void => {
      if (!menu.isOpen) {
        event.currentTarget.select();
      }

      open();
    },
    [menu.isOpen, open]
  );

  const value = edit.values[PROP];
  const handlePick = actions.pick;
  const isMixed = edit.mixed.has(PROP);
  const isOpen = menu.isOpen && rows.length > 0;
  const shownText = toShownFont(text, value, ui);
  const tip = toTip(value, all);

  const { failed } = fontPreview;

  return {
    active,
    failed,
    handleBlur,
    handleChange,
    handleClick,
    handleKeyDown,
    handlePick,
    isMixed,
    isOpen,
    rows,
    shownText,
    tip,
  };
};

export type { FontFieldState };

export { useFontField };
