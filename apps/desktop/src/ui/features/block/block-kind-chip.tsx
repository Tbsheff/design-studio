import { useCallback } from "react";
import type { ReactElement } from "react";

import type { KindFilter } from "./block-model.js";

import styles from "./block.module.css";

interface BlockKindChipProps {
  readonly id: KindFilter;
  readonly isActive: boolean;
  readonly label: string;
  readonly onSelect: (kind: KindFilter) => void;
}

const BlockKindChip = ({
  id,
  isActive,
  label,
  onSelect,
}: BlockKindChipProps): ReactElement => {
  const handleSelect = useCallback((): void => onSelect(id), [id, onSelect]);

  return (
    <button
      aria-pressed={isActive}
      className={styles.chip}
      onClick={handleSelect}
      type="button"
    >
      {label}
    </button>
  );
};

export { BlockKindChip };
