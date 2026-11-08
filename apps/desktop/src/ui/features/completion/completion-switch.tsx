import { useCallback, useId } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./completion.module.css";

interface CompletionSwitchProps {
  readonly isEnabled: boolean;
  readonly isPending: boolean;
  readonly onChange: (isEnabled: boolean) => void;
}

const toSwitchText = (isEnabled: boolean): string => {
  if (isEnabled) {
    return copy.on;
  }

  return copy.off;
};

const CompletionSwitch = ({
  isEnabled,
  isPending,
  onChange,
}: CompletionSwitchProps): ReactElement => {
  const switchId = useId();

  const handleToggleEnabled = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(event.target.checked);
    },
    [onChange]
  );

  return (
    <label className={styles.switch} htmlFor={switchId}>
      <input
        aria-checked={isEnabled}
        checked={isEnabled}
        disabled={isPending}
        id={switchId}
        role="switch"
        type="checkbox"
        onChange={handleToggleEnabled}
      />
      {toSwitchText(isEnabled)}
    </label>
  );
};

export { CompletionSwitch };
