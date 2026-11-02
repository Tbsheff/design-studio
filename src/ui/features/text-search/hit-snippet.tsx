import type { ReactElement } from "react";

import type { TextHit } from "./deps.js";
import { splitSnippet } from "./text-search-model.js";

import styles from "./text-search.module.css";

interface HitSnippetProps {
  readonly hit: TextHit;
}

const HitSnippet = ({ hit }: HitSnippetProps): ReactElement => {
  const parts = splitSnippet(hit);

  return (
    <span className={styles.snippet}>
      {parts.before}
      <mark className={styles.match}>{parts.match}</mark>
      {parts.after}
    </span>
  );
};

export { HitSnippet };
