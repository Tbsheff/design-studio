import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { STACKING_SIDES } from "./deps.js";
import type { StackingInfo, StackingSide } from "./deps.js";
import { InsetField } from "./inset-field.js";
import { shownValue } from "./stacking-model.js";

import styles from "./stacking.module.css";

interface InsetFieldsProps {
  readonly disabled: boolean;
  readonly info: StackingInfo;
  readonly onCommit: (side: StackingSide, raw: string) => void;
}

const InsetFields = ({
  disabled,
  info,
  onCommit,
}: InsetFieldsProps): ReactElement => (
  <fieldset aria-label={copy.inset} className={`ins-grid ${styles.group}`}>
    {STACKING_SIDES.map((side) => (
      <InsetField
        key={side}
        disabled={disabled}
        side={side}
        value={shownValue(info.inset[side])}
        onCommit={onCommit}
      />
    ))}
  </fieldset>
);

export { InsetFields };
