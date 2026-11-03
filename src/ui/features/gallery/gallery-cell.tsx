import { useCallback } from "react";
import type { ReactElement } from "react";

import { isFailing } from "./gallery-model.js";
import type { CellView } from "./gallery-model.js";

import styles from "./gallery.module.css";

interface GalleryCellProps {
  readonly cell: CellView;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
}

const GalleryCell = ({
  cell,
  isSelected,
  onSelect,
}: GalleryCellProps): ReactElement => {
  const handleSelectCell = useCallback(
    () => onSelect(cell.id),
    [cell.id, onSelect]
  );

  let tone = styles.cell;

  if (isFailing(cell)) {
    tone = `${styles.cell} ${styles.failing}`;
  }

  return (
    <button
      aria-pressed={isSelected}
      className={tone}
      data-selected={isSelected}
      data-tip={cell.error ?? cell.label}
      onClick={handleSelectCell}
      type="button"
    >
      <span className={styles.cellLabel}>{cell.label}</span>
      {cell.contrast !== null && (
        <span className={styles.cellMeta}>{cell.contrast}</span>
      )}
    </button>
  );
};

export { GalleryCell };
