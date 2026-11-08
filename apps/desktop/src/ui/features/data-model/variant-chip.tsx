import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { DataModelVariant } from "./data-model-model.js";

import styles from "./data-model.module.css";

interface VariantChipProps {
  readonly isChecked: boolean;
  readonly name: string;
  readonly onPick: (variant: DataModelVariant) => void;
  readonly variant: DataModelVariant;
}

const VariantChip = ({
  isChecked,
  name,
  onPick,
  variant,
}: VariantChipProps): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(variant);
  }, [onPick, variant]);

  return (
    <label className={styles.chip}>
      <input
        type="radio"
        className={styles.radio}
        name={name}
        value={variant}
        checked={isChecked}
        onChange={handlePick}
      />
      {copy.variants[variant]}
    </label>
  );
};

export { VariantChip };
