import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactNode } from "react";

const ACTION_ICON_SIZE = 15;

interface VersionRowActionProps {
  readonly disabled?: boolean;
  readonly icon: IconName;
  readonly label: string;
  readonly onClick: () => void;
  readonly pressed?: boolean;
  readonly tip: string;
}

const VersionRowAction = (props: VersionRowActionProps): ReactNode => (
  <button
    type="button"
    className="icon-btn"
    aria-label={props.label}
    data-tip={props.tip}
    data-tip-side="top"
    aria-pressed={props.pressed}
    disabled={props.disabled}
    onClick={props.onClick}
  >
    <Icon name={props.icon} size={ACTION_ICON_SIZE} />
  </button>
);

export { VersionRowAction };
