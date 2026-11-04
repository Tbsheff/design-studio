import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./accessibility.module.css";

interface DecorativeCheckProps {
  readonly disabled: boolean;
  readonly isDecorative: boolean;
  readonly onToggle: (isDecorative: boolean) => void;
}

const DecorativeCheck = ({
  disabled,
  isDecorative,
  onToggle,
}: DecorativeCheckProps): ReactElement => {
  const handleDecorativeToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onToggle(event.target.checked);
    },
    [onToggle]
  );

  return (
    <label className={styles.check} data-tip={copy.decorativeTip}>
      <input
        aria-label={copy.decorative}
        checked={isDecorative}
        disabled={disabled}
        type="checkbox"
        onChange={handleDecorativeToggle}
      />
      <span>{copy.decorative}</span>
    </label>
  );
};

export { DecorativeCheck };

export type { DecorativeCheckProps };
