import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { isSiteUrl } from "./pattern-model.js";

import styles from "./pattern.module.css";

interface PatternSiteUrlProps {
  readonly isFinding: boolean;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onFind: () => void;
  readonly url: string;
}

const PatternSiteUrl = ({
  isFinding,
  onChange,
  onFind,
  url,
}: PatternSiteUrlProps): ReactElement => {
  const isUrlValid = isSiteUrl(url);
  let findLabel: string = copy.findSections;

  if (isFinding) {
    findLabel = copy.finding;
  }

  return (
    <div className={styles.urlRow}>
      <label className={styles.field}>
        {copy.urlLabel}
        <input
          aria-invalid={url !== "" && !isUrlValid}
          className={styles.input}
          name="url"
          onChange={onChange}
          placeholder={copy.urlPlaceholder}
          value={url}
        />
      </label>
      <button
        className={styles.small}
        disabled={!isUrlValid || isFinding}
        onClick={onFind}
        type="button"
      >
        {findLabel}
      </button>
    </div>
  );
};

export { PatternSiteUrl };
