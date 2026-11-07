import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

import styles from "./effect.module.css";

interface EffectStepButtonProps {
  readonly disabled: boolean;
  readonly icon: IconName;
  readonly label: string;
  readonly onPress: () => void;
}

const EffectStepButton = ({
  disabled,
  icon,
  label,
  onPress,
}: EffectStepButtonProps): ReactElement => (
  <button
    aria-label={label}
    className={styles.step}
    data-tip={label}
    disabled={disabled}
    type="button"
    onClick={onPress}
  >
    <Icon name={icon} />
  </button>
);

export { EffectStepButton };

export type { EffectStepButtonProps };
