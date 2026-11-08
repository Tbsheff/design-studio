import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { COPY } from "./copy.js";

const SEARCH_ICON_SIZE = 13;

interface TokensSearchProps {
  readonly onQuery: (value: string) => void;
  readonly query: string;
}

const TokensSearch = ({ onQuery, query }: TokensSearchProps): ReactNode => {
  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onQuery(event.target.value);
    },
    [onQuery]
  );

  return (
    <div className="tk-search tkp-search">
      <Icon name="search" size={SEARCH_ICON_SIZE} />
      <input
        type="search"
        name="token-query"
        aria-label={COPY.labelFilterTokens}
        placeholder={COPY.placeholderFilterTokens}
        value={query}
        spellCheck={false}
        onChange={handleQueryChange}
      />
    </div>
  );
};

export { TokensSearch };
