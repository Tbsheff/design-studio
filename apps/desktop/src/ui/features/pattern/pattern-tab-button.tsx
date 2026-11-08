import { useCallback } from "react";
import type { ReactElement } from "react";

import styles from "./pattern.module.css";

interface PatternTabButtonProps<Tab extends string> {
  readonly id: Tab;
  readonly label: string;
  readonly onSelect: (tab: Tab) => void;
  readonly tab: Tab | null;
}

const PatternTabButton = <Tab extends string>({
  id,
  label,
  onSelect,
  tab,
}: PatternTabButtonProps<Tab>): ReactElement => {
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
