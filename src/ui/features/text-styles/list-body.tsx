import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { StyleRow } from "./style-row.js";
import type { TextStylesState } from "./use-text-styles.js";

import styles from "./text-styles.module.css";

interface ListBodyProps {
  readonly current: string | null;
  readonly onPick: (name: string) => void;
  readonly state: TextStylesState;
}

const ListBody = ({ current, onPick, state }: ListBodyProps): ReactElement => {
  if (state.loading && state.styles.length === 0) {
    return <p className={styles.empty}>{copy.loading}</p>;
  }

  if (state.styles.length === 0) {
    return <p className={styles.empty}>{copy.empty}</p>;
  }

  return (
    <div className={styles.rows}>
      {state.styles.map((item) => (
        <StyleRow
          active={item.name === current}
          disabled={state.busy}
          item={item}
          key={item.name}
          onPick={onPick}
        />
      ))}
    </div>
  );
};

export { ListBody };
