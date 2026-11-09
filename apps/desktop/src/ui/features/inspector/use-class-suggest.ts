import { routes } from "@design-studio/actions/token/routes";
import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { useAction } from "../../platform/query.js";
import {
  toKeyAction,
  toLastWord,
  toPickedClasses,
  toStepIndex,
  toSuggestRows,
  toWords,
} from "./class-suggest-model.js";
import type { SuggestRow } from "./class-suggest-model.js";
import type { ClassBody } from "./props-model.js";

interface ClassSuggestSetup {
  readonly directionId: string;
  readonly onSend: (body: ClassBody) => void;
  readonly projectId: string;
}

interface ClassSuggest {
  readonly active: number;
  readonly isOpen: boolean;
  readonly onBlur: () => void;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onFocus: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly onPick: (className: string) => void;
  readonly rows: readonly SuggestRow[];
  readonly typed: string;
}

const PAGE_LIMIT = 40;

const NO_ROW = -1;

const useSuggestRows = (
  projectId: string,
  directionId: string,
  word: string
): SuggestRow[] => {
  const input = useMemo(() => {
    if (word === "") {
      return null;
    }

    const cursor = null;
    const limit = PAGE_LIMIT;
    const query = word;

    return { cursor, directionId, limit, projectId, query };
  }, [directionId, projectId, word]);

  const found = useAction(routes.listClassesToken, input);
  const items = found.data?.items;

  const rows = useMemo(() => toSuggestRows(items ?? null, word), [items, word]);

  return rows;
};

const useClassSuggest = (setup: ClassSuggestSetup): ClassSuggest => {
  const { directionId, onSend, projectId } = setup;
  const [typed, setTyped] = useState("");
  const [active, setActive] = useState(NO_ROW);
  const [isFocused, setIsFocused] = useState(false);
  const word = toLastWord(typed);

  const rows = useSuggestRows(projectId, directionId, word);
  const isOpen = isFocused && rows.length > 0;

  const send = useCallback(
    (classes: string[]) => {
      if (classes.length === 0) {
        return;
      }

      onSend({ classes: { add: classes } });
      setTyped("");
      setActive(NO_ROW);
    },
    [onSend]
  );

  const onPick = useCallback(
    (className: string) => send(toPickedClasses(typed, className)),
    [send, typed]
  );

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTyped(event.target.value);
    setActive(NO_ROW);
  }, []);

  const onFocus = useCallback(() => setIsFocused(true), []);
  const onBlur = useCallback(() => setIsFocused(false), []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const picked = rows[active] ?? null;
      const action = toKeyAction(event.key, isOpen, picked !== null);

      if (action !== "none") {
        event.preventDefault();
      }

      if (action === "step") {
        setActive(toStepIndex(active, event.key, rows.length));
      }

      if (action === "clear") {
        setActive(NO_ROW);
      }

      if (action === "pick" && picked !== null) {
        onPick(picked.className);
      }

      if (action === "submit") {
        send(toWords(typed));
      }
    },
    [active, isOpen, onPick, rows, send, typed]
  );

  return {
    active,
    isOpen,
    onBlur,
    onChange,
    onFocus,
    onKeyDown,
    onPick,
    rows,
    typed,
  };
};

export { useClassSuggest };

export type { ClassSuggest };
