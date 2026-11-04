import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PlaceImageResult } from "./deps.js";

import styles from "./image-search.module.css";

interface CreditNoteProps {
  readonly placed: PlaceImageResult | null;
}

const CreditNote = ({ placed }: CreditNoteProps): ReactElement | null => {
  if (placed === null) {
    return null;
  }

  return (
    <p aria-live="polite" className={styles.credit}>
      <strong>{copy.credit}</strong>
      <br />
      {placed.credit}
    </p>
  );
};

export { CreditNote };
