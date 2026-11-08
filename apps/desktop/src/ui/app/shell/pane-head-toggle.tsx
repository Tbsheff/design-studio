import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

interface PaneHeadToggleProps {
  readonly buttonRef: ((element: HTMLButtonElement | null) => void) | null;
  readonly children?: ReactNode;
  readonly extraClass: string;
  readonly icon: IconName;
  readonly isPressed: boolean;
  readonly label: string;
  readonly onClick: () => void;
  readonly tip: string;
}

const PaneHeadToggle = ({
  buttonRef,
  children,
  extraClass,
  icon,
  isPressed,
  label,
  onClick,
  tip,
}: PaneHeadToggleProps): ReactElement => (
  <button
    ref={buttonRef}
    type="button"
    className={`icon-btn pane-head-btn ${extraClass}`}
    aria-label={label}
    aria-pressed={isPressed}
    data-tip={tip}
    data-tip-align="end"
    onClick={onClick}
  >
    <Icon name={icon} size={14} />
    {children}
  </button>
);

export { PaneHeadToggle };
