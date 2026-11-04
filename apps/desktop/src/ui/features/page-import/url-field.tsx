import { useCallback, useId } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { PAGE_IMPORT_URL_MAX } from "./deps.js";
import type { PageImportState } from "./use-page-import.js";

import styles from "./page-import.module.css";

interface UrlFieldProps {
  readonly state: PageImportState;
}

const UrlField = ({ state }: UrlFieldProps): ReactElement => {
  const id = useId();
  const { setUrl } = state;
  const isWrong = !state.isUrlOk && state.url.trim() !== "";

  const handleUrlType = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setUrl(event.target.value);
    },
    [setUrl]
  );

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {copy.url}
      </label>
      <input
        id={id}
        className="ins-input mono"
        type="url"
        aria-invalid={isWrong}
        autoComplete="off"
        disabled={state.isPending}
        maxLength={PAGE_IMPORT_URL_MAX}
        placeholder={copy.urlHint}
        spellCheck={false}
        value={state.url}
        onChange={handleUrlType}
      />
      {isWrong && (
        <p className={styles.problem} role="alert">
          {copy.urlWrong}
        </p>
      )}
    </div>
  );
};

export { UrlField };
