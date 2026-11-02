import type { ReactElement } from "react";

import { CreditNote } from "./credit-note.js";
import { ErrorLine } from "./error-line.js";
import { PhotoGrid } from "./photo-grid.js";
import { SearchForm } from "./search-form.js";
import { SearchOff } from "./search-off.js";
import type { PhotoPlace } from "./use-image-place.js";
import type { PhotoSearch } from "./use-image-search.js";

import styles from "./image-search.module.css";

interface SearchBodyProps {
  readonly place: PhotoPlace;
  readonly search: PhotoSearch;
}

const BODY_CLASS = `modal-body ${styles.body}`;

const SearchBody = ({ place, search }: SearchBodyProps): ReactElement => {
  const { status } = search;

  if (status === null) {
    return <div className={BODY_CLASS} />;
  }

  if (!status.on) {
    return (
      <div className={BODY_CLASS}>
        <SearchOff
          isPending={search.isPending}
          status={status}
          onSetting={search.handleSetting}
        />
        <ErrorLine message={search.problem} />
      </div>
    );
  }

  return (
    <div className={BODY_CLASS}>
      <SearchForm search={search} />
      <ErrorLine message={search.problem ?? place.problem} />
      <PhotoGrid
        hits={search.hits}
        isPending={search.isPending}
        place={place}
      />
      <CreditNote placed={place.placed} />
    </div>
  );
};

export { SearchBody };
