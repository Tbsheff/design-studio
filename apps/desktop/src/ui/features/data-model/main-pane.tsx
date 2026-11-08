import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DetailPane } from "./detail-pane.js";
import type { DataModelState } from "./use-data-model.js";

import styles from "./data-model.module.css";

interface MainPaneProps {
  readonly state: DataModelState;
}

const MainPane = ({ state }: MainPaneProps): ReactElement => {
  const { detail, error, handleVariant, variant } = state;

  return (
    <section className={styles.main}>
      {detail === null && <p className={styles.note}>{copy.pick}</p>}
      {detail !== null && (
        <DetailPane
          detail={detail}
          onVariant={handleVariant}
          variant={variant}
        />
      )}
      {error !== null && (
        <p className={styles.problem} role="alert">
          {error}
        </p>
      )}
    </section>
  );
};

export { MainPane };
