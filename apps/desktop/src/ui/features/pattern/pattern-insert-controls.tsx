import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

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

const PLACE_OPTIONS: readonly UiSelectOption[] = POSITIONS.map((option) => ({
  label: option.label,
  value: option.id,
}));

const PatternInsertControls = ({
  isBusy,
  onInsert,
  patternId,
  target,
}: PatternInsertControlsProps): ReactElement => {
  const [position, setPosition] = useState<PatternPosition>("inside");

  const handlePosition = useCallback((value: string): void => {
    if (isPosition(value)) {
      setPosition(value);
    }
  }, []);

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
      <UiSelect
        aria-label={copy.placeLabel}
        options={PLACE_OPTIONS}
        size="sm"
        value={position}
        onChange={handlePosition}
      />
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
