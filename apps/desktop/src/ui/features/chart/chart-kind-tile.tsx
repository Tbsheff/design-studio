import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ChartKind } from "./chart-model.js";

import styles from "./chart.module.css";

interface ChartKindTileProps {
  readonly id: ChartKind;
  readonly isActive: boolean;
  readonly label: string;
  readonly onSelect: (kind: ChartKind) => void;
}

const ChartKindTile = ({
  id,
  isActive,
  label,
  onSelect,
}: ChartKindTileProps): ReactElement => {
  const handleSelect = useCallback((): void => onSelect(id), [id, onSelect]);

  return (
    <button
      aria-pressed={isActive}
      className={styles.tile}
      onClick={handleSelect}
      type="button"
    >
      {label}
    </button>
  );
};

export { ChartKindTile };
