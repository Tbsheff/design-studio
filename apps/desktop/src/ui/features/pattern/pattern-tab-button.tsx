import { useCallback } from "react";
import type { ReactElement } from "react";

import type { InsertTab } from "./pattern-model.js";

import styles from "./pattern.module.css";

interface PatternTabButtonProps {
  readonly id: InsertTab;
  readonly label: string;
  readonly onSelect: (tab: InsertTab) => void;
  readonly tab: InsertTab;
}

const PatternTabButton = ({
  id,
  label,
  onSelect,
  tab,
}: PatternTabButtonProps): ReactElement => {
  const handleSelect = useCallback((): void => onSelect(id), [id, onSelect]);

  return (
    <button
      aria-selected={tab === id}
      className={styles.tab}
      onClick={handleSelect}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
};

export { PatternTabButton };
