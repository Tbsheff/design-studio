import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

import { toRadioClass, toTipAlign } from "./viewport-radio-model.js";

interface RadioProps {
  readonly icon: IconName;
  readonly isOn: boolean;
  readonly label: string;
  readonly name: string;
  readonly onSelect: () => void;
  readonly tip: string;
  readonly tipAlign: "start" | "end" | null;
}

const ViewportRadio = ({
  icon,
  isOn,
  label,
  name,
  onSelect,
  tip,
  tipAlign,
}: RadioProps): ReactElement => (
  <label
    className={toRadioClass(isOn, false)}
    data-tip={tip}
    data-tip-align={toTipAlign(tipAlign)}
  >
    <input
      type="radio"
      name={name}
      aria-label={label}
      checked={isOn}
      onChange={onSelect}
    />
    <Icon name={icon} />
  </label>
);

export { ViewportRadio };
