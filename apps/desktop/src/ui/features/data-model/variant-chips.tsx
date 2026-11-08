import { useId } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { VARIANTS } from "./data-model-model.js";
import type { DataModelVariant } from "./data-model-model.js";
import { VariantChip } from "./variant-chip.js";

import styles from "./data-model.module.css";

interface VariantChipsProps {
  readonly onPick: (variant: DataModelVariant) => void;
  readonly variant: DataModelVariant;
}

const VariantChips = ({ onPick, variant }: VariantChipsProps): ReactElement => {
  const name = useId();

  return (
    <fieldset className={styles.chips}>
      <legend className={styles.legend}>{copy.variantLabel}</legend>
      {VARIANTS.map((choice) => (
        <VariantChip
          key={choice}
          isChecked={choice === variant}
          name={name}
          onPick={onPick}
          variant={choice}
        />
      ))}
    </fieldset>
  );
};

export { VariantChips };
