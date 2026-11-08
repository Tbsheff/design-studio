import type { ReactElement, ReactNode } from "react";

import { Icon } from "./icon.js";
import {
  CHEVRON_SIZE,
  COMBOBOX_ROLE,
  toSelectClass,
} from "./ui-select-model.js";

interface SelectPlaceholderProps {
  readonly ariaLabel: string | undefined;
  readonly isDisabled: boolean | undefined;
  readonly icon: ReactNode;
  readonly id: string | undefined;
  readonly label: string;
  readonly rootClass: string;
  readonly size: "sm" | "md" | undefined;
}

const SelectPlaceholder = ({
  ariaLabel,
  isDisabled,
  icon,
  id,
  label,
  rootClass,
  size,
}: SelectPlaceholderProps): ReactElement => (
  <span className={`ui-select-root ${rootClass}`}>
    <button
      id={id}
      type="button"
      role={COMBOBOX_ROLE}
      className={toSelectClass(size)}
      aria-haspopup="listbox"
      aria-expanded={false}
      aria-label={ariaLabel}
      disabled={isDisabled}
    >
      {icon}
      <span className="ui-select-value truncate">{label}</span>
      <Icon name="chevronDown" size={CHEVRON_SIZE} />
    </button>
  </span>
);

export { SelectPlaceholder };

export type { SelectPlaceholderProps };
