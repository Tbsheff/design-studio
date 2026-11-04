import type { ReactElement } from "react";
import { useMemo } from "react";

import { ChoiceSelect } from "./choice-select.js";
import { copy } from "./copy.js";

import styles from "./animation.module.css";

interface HeadRow {
  readonly id: string;
  readonly name: string;
}

interface AnimationHeadProps {
  readonly hasKeyframe: boolean;
  readonly isBusy: boolean;
  readonly onAdd: () => void;
  readonly onClose: () => void;
  readonly onCreate: () => void;
  readonly onPick: (id: string) => void;
  readonly rows: readonly HeadRow[];
  readonly selectedId: string | null;
}

const AnimationHead = ({
  hasKeyframe,
  isBusy,
  onAdd,
  onClose,
  onCreate,
  onPick,
  rows,
  selectedId,
}: AnimationHeadProps): ReactElement => {
  const options = useMemo(
    () => [
      { id: "", label: copy.pick },
      ...rows.map((row) => ({ id: row.id, label: row.name })),
    ],
    [rows]
  );

  return (
    <header className={styles.head}>
      <strong className={styles.title}>{copy.animation}</strong>
      <ChoiceSelect
        label={copy.pick}
        onChoose={onPick}
        options={options}
        value={selectedId ?? ""}
      />
      <button
        className={styles.small}
        disabled={isBusy}
        onClick={onCreate}
        type="button"
      >
        {copy.create}
      </button>
      <button
        className={styles.small}
        disabled={!hasKeyframe}
        onClick={onAdd}
        type="button"
      >
        {copy.add}
      </button>
      <button className={styles.small} onClick={onClose} type="button">
        {copy.close}
      </button>
    </header>
  );
};

export { AnimationHead };
