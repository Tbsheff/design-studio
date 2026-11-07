import { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { isPosition, POSITIONS } from "./pattern-model.js";
import type { PatternPosition, PatternTarget } from "./pattern-model.js";

import styles from "./pattern.module.css";

interface PatternInsertControlsProps {
  readonly isBusy: boolean;
  readonly onInsert: (
    patternId: string,
    position: PatternPosition,
    target: PatternTarget
  ) => void;
  readonly patternId: string;
  readonly target: PatternTarget | null;
}

const PatternInsertControls = ({
  isBusy,
  onInsert,
  patternId,
  target,
}: PatternInsertControlsProps): ReactElement => {
  const [position, setPosition] = useState<PatternPosition>("inside");

  const handlePosition = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const { value } = event.target;

      if (isPosition(value)) {
        setPosition(value);
      }
    },
    []
  );

  const handleInsert = useCallback((): void => {
    if (target !== null) {
      onInsert(patternId, position, target);
    }
  }, [onInsert, patternId, position, target]);

  let tip: string = copy.insertTip;

  if (target === null) {
    tip = copy.insertNeedsLayer;
  }

  return (
    <div className={styles.actions}>
      <select
        aria-label={copy.placeLabel}
        className={styles.select}
        onChange={handlePosition}
        value={position}
      >
        {POSITIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        className={styles.small}
        data-tip={tip}
        disabled={isBusy || target === null}
        onClick={handleInsert}
        type="button"
      >
        {copy.insert}
      </button>
    </div>
  );
};

export { PatternInsertControls };
