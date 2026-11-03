import { useCallback } from "react";
import type { ReactElement } from "react";

import { MAX_REPEAT, MIN_REPEAT } from "./content-model.js";
import { copy } from "./copy.js";

import styles from "./content.module.css";

interface RepeatStepperProps {
  readonly onStep: (delta: number) => void;
  readonly repeat: number;
}

const RepeatStepper = ({
  onStep,
  repeat,
}: RepeatStepperProps): ReactElement => {
  const handleLess = useCallback(() => onStep(-1), [onStep]);
  const handleMore = useCallback(() => onStep(1), [onStep]);

  return (
    <div className={styles.stepper}>
      <span className={styles.label}>{copy.repeatLabel}</span>
      <button
        aria-label={copy.decrease}
        className={styles.step}
        disabled={repeat <= MIN_REPEAT}
        onClick={handleLess}
        type="button"
      >
        {copy.minus}
      </button>
      <output className={styles.value}>{repeat}</output>
      <button
        aria-label={copy.increase}
        className={styles.step}
        disabled={repeat >= MAX_REPEAT}
        onClick={handleMore}
        type="button"
      >
        {copy.plus}
      </button>
    </div>
  );
};

export { RepeatStepper };
