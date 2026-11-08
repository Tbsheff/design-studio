import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./dev-note.module.css";

interface MeasureSwitchProps {
  readonly isDisabled: boolean;
  readonly isOn: boolean;
  readonly onToggle: () => void;
}

const MeasureSwitch = ({
  isDisabled,
  isOn,
  onToggle,
}: MeasureSwitchProps): ReactElement => {
  let tip: string = copy.measureTip;

  if (isDisabled) {
    tip = copy.measureNeedsSource;
  }

  let switchClass = styles.switch;

  if (isOn) {
    switchClass = `${styles.switch} ${styles.switchOn}`;
  }

  return (
    <div className={styles.switchRow} data-tip={tip}>
      <span id="dev-note-measure-label">{copy.measure}</span>
      <button
        aria-checked={isOn}
        aria-labelledby="dev-note-measure-label"
        className={switchClass}
        disabled={isDisabled}
        onClick={onToggle}
        role="switch"
        type="button"
      >
        <span className={styles.knob} />
      </button>
    </div>
  );
};

export { MeasureSwitch };

export type { MeasureSwitchProps };
