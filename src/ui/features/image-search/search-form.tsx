import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { OrientationChips } from "./orientation-chips.js";
import type { PhotoSearch } from "./use-image-search.js";

import styles from "./image-search.module.css";

interface SearchFormProps {
  readonly search: PhotoSearch;
}

const SearchForm = ({ search }: SearchFormProps): ReactElement => {
  const { handleQuery } = search;

  const handleQueryEdit = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      handleQuery(event.target.value);
    },
    [handleQuery]
  );

  return (
    <>
      <form className={styles.form} onSubmit={search.handleSubmit}>
        <input
          aria-label={copy.search}
          className="ins-input"
          name="query"
          placeholder={copy.searchPlaceholder}
          type="search"
          value={search.query}
          onChange={handleQueryEdit}
        />
        <button
          className="btn primary small"
          disabled={search.isPending || search.query.trim() === ""}
          type="submit"
        >
          {copy.submit}
        </button>
      </form>
      <OrientationChips
        value={search.orientation}
        onPick={search.handleOrientation}
      />
    </>
  );
};

export { SearchForm };
