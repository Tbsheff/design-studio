import { useCallback } from "react";
import type { ReactElement } from "react";

import type { PatternCandidate } from "./pattern-model.js";

import styles from "./pattern.module.css";

interface PatternSiteTileProps {
  readonly candidate: PatternCandidate;
  readonly isSelected: boolean;
  readonly onSelect: (candidate: PatternCandidate) => void;
}

const PatternSiteTile = ({
  candidate,
  isSelected,
  onSelect,
}: PatternSiteTileProps): ReactElement => {
  const handleSelect = useCallback(
    (): void => onSelect(candidate),
    [candidate, onSelect]
  );

  const thumbnail = candidate.thumbnail ?? null;

  return (
    <li>
      <button
        aria-pressed={isSelected}
        className={styles.tile}
        onClick={handleSelect}
        type="button"
      >
        {thumbnail !== null && (
          <img alt="" className={styles.tileImage} src={thumbnail} />
        )}
        <span className={styles.tileLabel}>{candidate.label}</span>
      </button>
    </li>
  );
};

export { PatternSiteTile };
