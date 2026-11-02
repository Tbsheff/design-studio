import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Z_SCALE } from "./deps.js";
import { StackingTextField } from "./stacking-text-field.js";

interface ZIndexFieldProps {
  readonly disabled: boolean;
  readonly value: string;
  readonly onCommit: (raw: string) => void;
}

const Z_LIST_ID = "stacking-z-scale";

const ZIndexField = ({
  disabled,
  value,
  onCommit,
}: ZIndexFieldProps): ReactElement => (
  <>
    <StackingTextField
      disabled={disabled}
      id="stacking-z-index"
      label={copy.zIndex}
      list={Z_LIST_ID}
      tip={copy.zTip}
      value={value}
      onCommit={onCommit}
    />
    <datalist id={Z_LIST_ID}>
      {Z_SCALE.map((step) => (
        <option key={step} value={step}>
          {step}
        </option>
      ))}
    </datalist>
  </>
);

export { ZIndexField };
