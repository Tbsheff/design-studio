import { useCallback, useEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toHistoryKeyAction } from "./history-search-model.js";
import type { HistorySearchState } from "./use-history-search.js";

const HistorySearchInput = ({
  search,
  onPick,
}: {
  search: HistorySearchState;
  onPick: (prompt: string) => void;
}): ReactElement => {
  const { changeQuery, close, current, move, query } = search;

  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => changeQuery(event.target.value),
    [changeQuery]
  );

  const press = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      const action = toHistoryKeyAction(
        event.key,
        event.ctrlKey,
        current !== null
      );

      if (action === null) {
        return;
      }

      switch (action) {
        case "close": {
          close();
          break;
        }

        case "pick": {
          onPick(current ?? "");
          break;
        }

        case "previous": {
          move(-1);
          break;
        }

        default: {
          move(1);
        }
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [close, current, move, onPick]
  );

  return (
    <input
      ref={ref}
      className="skill-search"
      aria-label={copy.searchPastPrompts}
      placeholder={copy.searchPastPrompts}
      value={query}
      onChange={change}
      onKeyDown={press}
    />
  );
};

export { HistorySearchInput };
