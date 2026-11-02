import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ICON_SIZE_MAX, ICON_SIZE_MIN } from "./deps.js";
import type { Picker } from "./use-picker.js";

interface SizeFieldProps {
  readonly picker: Picker;
}

const SizeField = ({ picker }: SizeFieldProps): ReactElement => (
  <label className="field">
    <span>{copy.size}</span>
    <input
      aria-label={copy.size}
      inputMode="numeric"
      max={ICON_SIZE_MAX}
      min={ICON_SIZE_MIN}
      name="size"
      type="number"
      value={picker.size}
      onChange={picker.handleSize}
    />
  </label>
);

export { SizeField };
