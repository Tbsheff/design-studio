import type { ReactElement } from "react";

import { BlockKindChip } from "./block-kind-chip.js";
import { KIND_OPTIONS } from "./block-model.js";
import type { KindFilter } from "./block-model.js";
import { copy } from "./copy.js";

import styles from "./block.module.css";

interface BlockKindChipsProps {
  readonly kind: KindFilter;
  readonly onSelect: (kind: KindFilter) => void;
}

const BlockKindChips = ({
  kind,
  onSelect,
}: BlockKindChipsProps): ReactElement => (
  <fieldset aria-label={copy.kindsLabel} className={styles.chips}>
    {KIND_OPTIONS.map((option) => (
      <BlockKindChip
        id={option.id}
        isActive={option.id === kind}
        key={option.id ?? copy.allKinds}
        label={option.label}
        onSelect={onSelect}
      />
    ))}
  </fieldset>
);

export { BlockKindChips };
