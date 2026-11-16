import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { StateDot } from "./state-dot.js";

import styles from "./state-styles.module.css";

interface DarkToggleProps {
  readonly hasStyles: boolean;
  readonly isDisabled: boolean;
  readonly isOn: boolean;
  readonly onToggle: () => void;
}

const ICON_SIZE = 14;

const classOf = (isOn: boolean): string => {
  if (isOn) {
    return `${styles.chip} ${styles.icon} ${styles.on}`;
  }

  return `${styles.chip} ${styles.icon}`;
};

const DarkToggle = ({
  hasStyles,
  isDisabled,
  isOn,
  onToggle,
}: DarkToggleProps): ReactElement => (
  <button
    aria-label={copy.label.dark}
    aria-pressed={isOn}
    className={classOf(isOn)}
    data-tip={copy.chipTip.dark}
    disabled={isDisabled}
    onClick={onToggle}
    type="button"
  >
    <Icon name="moon" size={ICON_SIZE} />
    <StateDot isShown={hasStyles} />
  </button>
);

export { DarkToggle };
