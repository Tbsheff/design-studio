import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";

import { COPY } from "./copy.js";
import { isEscapeKey } from "./layers-keys-model.js";
import type { LayerSearchApi } from "./use-layer-search.js";

const SEARCH_ICON_SIZE = 13;

interface LayerSearchFieldProps {
  readonly search: LayerSearchApi;
}

const toCountText = (count: number): string => {
  if (count === 1) {
    return COPY.layersMatchOne;
  }

  return `${count}${COPY.layersMatchesSuffix}`;
};

type SearchKeyAction = "next" | "prev" | "select";

const toSearchKeyAction = (key: string): SearchKeyAction | null => {
  if (key === "Enter") {
    return "select";
  }

  if (key === "ArrowDown") {
    return "next";
  }

  if (key === "ArrowUp") {
    return "prev";
  }

  return null;
};

const LayerSearchField = ({ search }: LayerSearchFieldProps): ReactNode => {
  const { count, dismiss, inputRef, isActive, query, selectActive } = search;
  const { setQuery, step } = search;

  const updateQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  const runKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      const action = toSearchKeyAction(event.key);

      if (isEscapeKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        dismiss();

        return;
      }

      if (action === null) {
        return;
      }

      event.preventDefault();

      if (action === "select") {
        selectActive();
      } else if (action === "next") {
        step(1);
      } else {
        step(-1);
      }
    },
    [dismiss, selectActive, step]
  );

  return (
    <div className="tk-search layers-search">
      <Icon name="search" size={SEARCH_ICON_SIZE} />
      <input
        ref={inputRef}
        type="search"
        name="layer-query"
        aria-label={COPY.labelSearchLayers}
        placeholder={COPY.placeholderSearchLayers}
        value={query}
        spellCheck={false}
        onChange={updateQuery}
        onKeyDown={runKey}
      />
      {isActive && (
        <output className="layers-search-count">{toCountText(count)}</output>
      )}
    </div>
  );
};

export { LayerSearchField };
