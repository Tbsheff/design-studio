import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

const KeepOpenRow = ({
  icon,
  isDisabled,
  label,
  onPick,
  tip,
}: {
  icon: IconName;
  isDisabled: boolean;
  label: string;
  onPick: () => void;
  tip: string | null;
}): ReactElement => (
  <button
    type="button"
    role="menuitem"
    className="ui-menu-item"
    tabIndex={-1}
    disabled={isDisabled}
    data-tip={tip}
    onClick={onPick}
  >
    <Icon name={icon} size={14} />
    <span>{label}</span>
  </button>
);

export { KeepOpenRow };
