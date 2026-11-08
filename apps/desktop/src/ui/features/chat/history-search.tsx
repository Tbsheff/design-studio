import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { HistorySearchInput } from "./history-search-input.js";
import { HistorySearchOption } from "./history-search-option.js";
import type { HistorySearchState } from "./use-history-search.js";

const HistorySearch = ({
  search,
  onPick,
}: {
  search: HistorySearchState;
  onPick: (prompt: string) => void;
}): ReactElement | null => {
  if (!search.open) {
    return null;
  }

  return (
    <dialog
      open
      className="skill-pop history-pop"
      aria-label={copy.searchPastPrompts}
      data-testid="history-search"
    >
      <HistorySearchInput search={search} onPick={onPick} />
      <ul aria-label={copy.pastPrompts} className="skill-opts">
        {search.shown.map((prompt) => (
          <HistorySearchOption
            key={prompt}
            isActive={prompt === search.current}
            prompt={prompt}
            onPick={onPick}
          />
        ))}
        {search.shown.length === 0 && (
          <li className="skill-empty">{copy.noPastPromptMatches}</li>
        )}
      </ul>
      <p className="skill-pop-foot">{copy.ctrlROrFor}</p>
    </dialog>
  );
};

export { HistorySearch };
