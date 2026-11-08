import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactElement, SetStateAction } from "react";

import { fuzzyRank } from "../../../shared/fuzzy.js";
import { copy } from "./copy.js";

interface UseHistorySearchResult {
  readonly close: () => void;
  readonly current: string | null;
  readonly move: (step: 1 | -1) => void;
  readonly open: boolean;
  readonly query: string;
  readonly setQuery: Dispatch<SetStateAction<string>>;
  readonly shown: string[];
  readonly start: () => void;
}

const useHistorySearch = (
  history: readonly string[]
): UseHistorySearchResult => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const shown = useMemo(
    () => fuzzyRank([...history].toReversed(), query, (prompt) => prompt, 20),
    [history, query]
  );

  useEffect(() => setActive(0), [query, open]);

  const current =
    shown[Math.min(active, Math.max(0, shown.length - 1))] ?? null;

  return {
    close: (): void => setOpen(false),
    current,
    move: (step: 1 | -1): void =>
      setActive((index) => {
        if (shown.length === 0) {
          return 0;
        }

        return (index + step + shown.length) % shown.length;
      }),
    open,
    query,
    setQuery,
    shown,
    start: (): void => {
      setQuery("");
      setOpen(true);
    },
  };
};

const HistorySearch = ({
  search,
  onPick,
}: {
  search: ReturnType<typeof useHistorySearch>;
  onPick: (prompt: string) => void;
}): ReactElement | null => {
  if (!search.open) {
    return null;
  }

  return (
    <div
      className="skill-pop history-pop"
      role="dialog"
      aria-label={copy.searchPastPrompts}
      data-testid="history-search"
    >
      <input
        autoFocus
        className="skill-search"
        aria-label={copy.searchPastPrompts}
        placeholder={copy.searchPastPrompts}
        value={search.query}
        onChange={(event) => search.setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            search.close();
          } else if (event.key === "Enter" && search.current) {
            onPick(search.current);
          } else if (
            event.key === "ArrowDown" ||
            event.key === "ArrowUp" ||
            (event.ctrlKey && event.key === "r")
          ) {
            search.move(event.key === "ArrowUp" ? -1 : 1);
          } else {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
        }}
      />
      <ul role="listbox" aria-label={copy.pastPrompts} className="skill-opts">
        {search.shown.map((prompt) => (
          <li
            key={prompt}
            role="option"
            aria-selected={prompt === search.current}
            className={`skill-opt ${prompt === search.current ? "active" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(prompt)}
          >
            <span className="skill-opt-desc history-text">{prompt}</span>
          </li>
        ))}
        {search.shown.length === 0 && (
          <li className="skill-empty">{copy.noPastPromptMatches}</li>
        )}
      </ul>
      <p className="skill-pop-foot">{copy.ctrlROrFor}</p>
    </div>
  );
};

export { HistorySearch, useHistorySearch };
