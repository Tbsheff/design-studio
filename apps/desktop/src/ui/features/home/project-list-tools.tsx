import { Icon, LazySelect } from "@design-studio/ui";
import { useCallback } from "react";
import type {
  ChangeEvent,
  KeyboardEvent,
  ReactElement,
  RefObject,
} from "react";

import { HOME_SORTS, uiStore, useUi } from "../../platform/storage.js";
import { copy } from "./copy.js";
import type { HomeSort } from "./deps.js";
import { ViewTools } from "./view-tools.js";

const SEARCH_ICON_SIZE = 14;

const SORT_LABELS: Record<HomeSort, string> = {
  created: "Created",
  name: "Name",
  recent: "Recent",
};

const SORT_OPTIONS = HOME_SORTS.map((sort) => ({
  label: SORT_LABELS[sort],
  value: sort,
}));

interface ProjectListToolsProps {
  readonly query: string;
  readonly onQuery: (query: string) => void;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly onFirst: () => void;
  readonly onOpenFirst: () => void;
  readonly canOpen: boolean;
}

const setHomeSort = (sort: HomeSort): void => {
  uiStore.set({ homeSort: sort });
};

const ProjectListTools = ({
  query,
  onQuery,
  searchRef,
  onFirst,
  onOpenFirst,
  canOpen,
}: ProjectListToolsProps): ReactElement => {
  const { homeSort } = useUi();

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onQuery(event.target.value);
    },
    [onQuery]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "ArrowDown" && canOpen) {
        event.preventDefault();
        onFirst();

        return;
      }

      if (event.key === "Enter" && canOpen) {
        event.preventDefault();
        onOpenFirst();

        return;
      }

      if (event.key === "Escape" && query) {
        event.preventDefault();
        event.stopPropagation();
        onQuery("");
      }
    },
    [canOpen, onFirst, onOpenFirst, onQuery, query]
  );

  return (
    <div className="home-list-tools">
      <label className="home-search">
        <Icon name="search" size={SEARCH_ICON_SIZE} />
        <input
          ref={searchRef}
          type="search"
          aria-label={copy.searchProjects}
          placeholder={copy.search}
          value={query}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
        {!query && (
          <kbd className="home-search-key" aria-hidden="true">
            {copy.slash}
          </kbd>
        )}
      </label>
      <ViewTools />
      <span className="home-sort">
        <LazySelect
          aria-label={copy.sortProjects}
          value={homeSort}
          options={SORT_OPTIONS}
          onChange={setHomeSort}
        />
      </span>
    </div>
  );
};

export { ProjectListTools };
