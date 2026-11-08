import { UiSelect } from "@design-studio/ui";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { MODES } from "./nds-model.js";
import type { Mode } from "./new-design-system-values.js";

const ModeSelect = ({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (mode: Mode) => void;
}): ReactElement => (
  <label className="field">
    <span>{COPY.labelMode}</span>
    <UiSelect
      aria-label={COPY.labelMode}
      options={MODES}
      value={value}
      onChange={onChange}
    />
  </label>
);

export { ModeSelect };
