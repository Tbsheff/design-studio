import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { Variant } from "./generate-model.js";

import styles from "./image-generate.module.css";

interface VariantCardProps {
  readonly isBusy: boolean;
  readonly onUse: (variant: Variant) => void;
  readonly variant: Variant;
}

const VariantCard = ({
  isBusy,
  onUse,
  variant,
}: VariantCardProps): ReactElement => {
  const handleUse = useCallback((): void => {
    onUse(variant);
  }, [onUse, variant]);

  return (
    <li className={styles.card}>
      <img alt={variant.alt} className={styles.image} src={variant.preview} />
      <button
        className="btn small"
        disabled={isBusy}
        type="button"
        onClick={handleUse}
      >
        {copy.use}
      </button>
    </li>
  );
};

export { VariantCard };
