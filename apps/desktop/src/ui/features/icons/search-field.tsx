import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { Picker } from "./use-picker.js";

import styles from "./icons.module.css";

interface SearchFieldProps {
  readonly gridId: string;
  readonly hintId: string;
  readonly picker: Picker;
}

const SearchField = ({
  gridId,
  hintId,
  picker,
}: SearchFieldProps): ReactElement => (
  <input
    aria-controls={gridId}
    aria-describedby={hintId}
    aria-label={copy.search}
    autoComplete="off"
    className={styles.search}
    data-autofocus
    name="query"
    placeholder={copy.search}
    spellCheck={false}
    type="search"
    value={picker.query}
    onChange={picker.handleQuery}
    onKeyDown={picker.handleSearchKey}
  />
);

export { SearchField };
