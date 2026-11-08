import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ErrorsHeadButtonProps {
  readonly label: string;
  readonly onClose: () => void;
}

const ErrorsHeadButton = ({
  label,
  onClose,
}: ErrorsHeadButtonProps): ReactElement => (
  <button
    type="button"
    className="errors-head"
    aria-expanded
    data-tip={copy.hideTheErrors}
    onClick={onClose}
  >
    <Icon name="alert" size={14} />
    <span>{label}</span>
    <Icon name="chevronDown" size={12} />
  </button>
);

export { ErrorsHeadButton };
