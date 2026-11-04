import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { Variant } from "./generate-model.js";
import { VariantCard } from "./variant-card.js";

import styles from "./image-generate.module.css";

interface VariantGridProps {
  readonly isBusy: boolean;
  readonly onUse: (variant: Variant) => void;
  readonly variants: readonly Variant[];
}

const VariantGrid = ({
  isBusy,
  onUse,
  variants,
}: VariantGridProps): ReactElement | null => {
  if (variants.length === 0) {
    return null;
  }

  return (
    <ul aria-label={copy.variants} className={styles.grid}>
      {variants.map((variant) => (
        <VariantCard
          isBusy={isBusy}
          key={variant.asset}
          variant={variant}
          onUse={onUse}
        />
      ))}
    </ul>
  );
};

export { VariantGrid };
