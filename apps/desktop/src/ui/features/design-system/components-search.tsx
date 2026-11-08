import { Icon } from "@design-studio/ui";
import type { ChangeEvent, ReactElement } from "react";
import { useCallback } from "react";

import { COPY } from "./copy.js";

const SEARCH_ICON_SIZE = 13;

const ComponentsSearch = ({
  onChange,
  query,
}: {
  onChange: (query: string) => void;
  query: string;
}): ReactElement => {
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(event.target.value);
    },
    [onChange]
  );

  return (
    <div className="tk-search cmp-search">
      <Icon name="search" size={SEARCH_ICON_SIZE} />
      <input
        type="search"
        aria-label={COPY.labelSearchComponents}
        placeholder={COPY.placeholderSearchComponents}
        value={query}
        spellCheck={false}
        onChange={change}
      />
    </div>
  );
};

export { ComponentsSearch };
