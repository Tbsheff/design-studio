import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ModelRow } from "./model-row.js";
import type { DataModelState } from "./use-data-model.js";

import styles from "./data-model.module.css";

interface ModelListProps {
  readonly items: DataModelState["items"];
  readonly onPick: (name: string) => void;
  readonly selected: string | null;
}

const ModelList = ({
  items,
  onPick,
  selected,
}: ModelListProps): ReactElement => {
  if (items.length === 0) {
    return <p className={styles.note}>{copy.empty}</p>;
  }

  return (
    <ul className={styles.list} aria-label={copy.listLabel}>
      {items.map((item) => (
        <ModelRow
          key={item.name}
          isSelected={selected === item.name}
          kind={item.kind}
          name={item.name}
          onPick={onPick}
        />
      ))}
    </ul>
  );
};

export { ModelList };
