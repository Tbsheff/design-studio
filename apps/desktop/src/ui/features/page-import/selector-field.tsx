import { useCallback, useId } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { PAGE_IMPORT_SELECTOR_MAX } from "./deps.js";
import type { PageImportState } from "./use-page-import.js";

import styles from "./page-import.module.css";

interface SelectorFieldProps {
  readonly state: PageImportState;
}

const SelectorField = ({ state }: SelectorFieldProps): ReactElement => {
  const id = useId();
  const noteId = useId();
  const { setSelector } = state;

  const handleSelectorType = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setSelector(event.target.value);
    },
    [setSelector]
  );

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {copy.selector}
      </label>
      <input
        id={id}
        className="ins-input mono"
        aria-describedby={noteId}
        autoComplete="off"
        disabled={state.isPending}
        maxLength={PAGE_IMPORT_SELECTOR_MAX}
        placeholder={copy.selectorHint}
        spellCheck={false}
        value={state.selector}
        onChange={handleSelectorType}
      />
      <p id={noteId} className={styles.note}>
        {copy.selectorNote}
      </p>
    </div>
  );
};

export { SelectorField };
