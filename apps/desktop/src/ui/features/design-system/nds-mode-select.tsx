import type { ChangeEvent, ReactElement } from "react";

import { COPY } from "./copy.js";
import { MODES } from "./nds-model.js";
import type { Mode } from "./new-design-system-values.js";

const ModeSelect = ({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}): ReactElement => (
  <label className="field">
    <span>{COPY.labelMode}</span>
    <select
      className="select"
      value={value}
      aria-label={COPY.labelMode}
      onChange={onChange}
    >
      {MODES.map((mode) => (
        <option key={mode.value} value={mode.value}>
          {mode.label}
        </option>
      ))}
    </select>
  </label>
);

export { ModeSelect };
