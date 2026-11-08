import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

import { toRadioClass } from "./viewport-radio-model.js";

interface SourceRadioProps {
  readonly icon: IconName;
  readonly isDisabled: boolean;
  readonly isOn: boolean;
  readonly label: string;
  readonly onSelect: () => void;
  readonly tip: string;
}

const SourceRadio = ({
  icon,
  isDisabled,
  isOn,
  label,
  onSelect,
  tip,
}: SourceRadioProps): ReactElement => (
  <label className={toRadioClass(isOn, isDisabled)} data-tip={tip}>
    <input
      type="radio"
      name="preview-source"
      aria-label={label}
      checked={isOn}
      disabled={isDisabled}
      onChange={onSelect}
    />
    <span className="seg-icon">
      <Icon name={icon} />
    </span>
    <span className="seg-label">{label}</span>
  </label>
);

export { SourceRadio };
