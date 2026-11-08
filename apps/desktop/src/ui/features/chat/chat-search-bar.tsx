import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";

const SEARCH_ICON_SIZE = 14;

interface ChatSearchBarProps {
  readonly activeId: string | null;
  readonly count: string;
  readonly isExpanded: boolean;
  readonly listId: string;
  readonly query: string;
  readonly onClose: () => void;
  readonly onKey: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly onQuery: (query: string) => void;
}

const ChatSearchBar = ({
  activeId,
  count,
  isExpanded,
  listId,
  query,
  onClose,
  onKey,
  onQuery,
}: ChatSearchBarProps): ReactElement => {
  const changeQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onQuery(event.target.value),
    [onQuery]
  );

  return (
    <div className="chat-search-bar">
      <span className="chat-search-icon">
        <Icon name="search" size={SEARCH_ICON_SIZE} />
      </span>
      <input
        type="search"
        role="combobox"
        className="chat-search-input"
        aria-label={copy.searchRuns}
        aria-expanded={isExpanded}
        aria-controls={listId}
        aria-activedescendant={activeId ?? ""}
        placeholder={copy.searchAllRuns}
        value={query}
        onChange={changeQuery}
        onKeyDown={onKey}
      />
      {count !== "" && (
        <span
          className="chat-search-count tabular-nums"
          aria-live="polite"
          data-testid="chat-search-count"
        >
          {count}
        </span>
      )}
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.closeSearch}
        data-tip={copy.closeEsc}
        data-tip-side="top"
        data-tip-align="end"
        onClick={onClose}
      >
        <Icon name="close" size={SEARCH_ICON_SIZE} />
      </button>
    </div>
  );
};

export { ChatSearchBar };
