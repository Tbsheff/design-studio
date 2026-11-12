import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

const ITEM_ICON_SIZE = 14;
const CHECK_ROLE = "menuitemcheckbox";

interface TokenSweepItemProps {
  readonly isOn: boolean;
  readonly label: string;
  readonly onToggle: () => void;
  readonly tip: string;
}

const TokenSweepItem = ({
  isOn,
  label,
  onToggle,
  tip,
}: TokenSweepItemProps): ReactNode => (
  <div className="ui-menu-section">
    <button
      type="button"
      role={CHECK_ROLE}
      className="ui-menu-item"
      tabIndex={-1}
      aria-checked={isOn}
      data-tip={tip}
      data-tip-side="right"
      onClick={onToggle}
    >
      <Icon name="scan" size={ITEM_ICON_SIZE} />
      <span>{label}</span>
    </button>
  </div>
);

export { TokenSweepItem };
