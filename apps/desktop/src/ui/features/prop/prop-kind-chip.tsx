import { useCallback } from "react";
import type { ReactElement } from "react";

import type { KindOption, MakeKind } from "./prop-model.js";

import styles from "./prop.module.css";

interface PropKindChipProps {
  readonly isSelected: boolean;
  readonly onSelect: (kind: MakeKind) => void;
  readonly option: KindOption;
}

const PropKindChip = ({
  isSelected,
  onSelect,
  option,
}: PropKindChipProps): ReactElement => {
  const { id, label } = option;
  const selectKind = useCallback((): void => onSelect(id), [id, onSelect]);

  return (
    <button
      aria-pressed={isSelected}
      className={styles.chip}
      onClick={selectKind}
      type="button"
    >
      {label}
    </button>
  );
};

export { PropKindChip };
