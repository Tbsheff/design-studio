import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

const ICON_SIZE = 14;

const AccountRow = ({
  icon,
  isDisabled,
  label,
  onRun,
}: {
  readonly icon: IconName;
  readonly isDisabled: boolean;
  readonly label: string;
  readonly onRun: () => void;
}): ReactElement => (
  <button
    type="button"
    role="menuitem"
    className="ui-menu-item"
    disabled={isDisabled}
    onClick={onRun}
  >
    <Icon name={icon} size={ICON_SIZE} />
    <span>{label}</span>
  </button>
);

export { AccountRow };
