import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ViewportPreset } from "./page-import-model.js";

import styles from "./page-import.module.css";

interface ViewportOptionProps {
  readonly disabled: boolean;
  readonly isChecked: boolean;
  readonly name: string;
  readonly onPick: (width: number) => void;
  readonly preset: ViewportPreset;
}

const ViewportOption = (props: ViewportOptionProps): ReactElement => {
  const { onPick, preset } = props;

  const handlePick = useCallback(() => {
    onPick(preset.width);
  }, [onPick, preset.width]);

  return (
    <label className={styles.preset}>
      <input
        type="radio"
        className={styles.radio}
        name={props.name}
        value={preset.width}
        checked={props.isChecked}
        disabled={props.disabled}
        onChange={handlePick}
      />
      {preset.label}
    </label>
  );
};

export { ViewportOption };
