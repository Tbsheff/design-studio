import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import type { PatternPreview } from "./rename-pattern-model.js";

import styles from "./rename-many.module.css";

interface RenameManyPreviewProps {
  readonly preview: PatternPreview;
}

const toMoreText = (more: number): string => {
  if (more === 0) {
    return "";
  }

  return `${COPY.andPrefix}${more}${COPY.andMoreFiles}`;
};

const RenameManyPreview = ({ preview }: RenameManyPreviewProps): ReactNode => {
  const moreText = toMoreText(preview.more);

  return (
    <ul className={styles.list} data-testid="rename-many-preview">
      {preview.rows.map((row) => (
        <li key={row.id} className={styles.name}>
          {row.name}
        </li>
      ))}
      {moreText !== "" && <li className={styles.more}>{moreText}</li>}
    </ul>
  );
};

export { RenameManyPreview };
