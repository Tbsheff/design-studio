import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

interface PaneHeadButtonProps {
  readonly children?: ReactNode;
  readonly extraClass: string;
  readonly icon: IconName;
  readonly label: string;
  readonly onClick: () => void;
  readonly tip: string;
}

const PaneHeadButton = ({
  children,
  extraClass,
  icon,
  label,
  onClick,
  tip,
}: PaneHeadButtonProps): ReactElement => (
  <button
    type="button"
    className={`icon-btn pane-head-btn ${extraClass}`}
    aria-label={label}
    data-tip={tip}
    data-tip-align="end"
    onClick={onClick}
  >
    <Icon name={icon} size={14} />
    {children}
  </button>
);

export { PaneHeadButton };
