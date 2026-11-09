import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { tipWithKey } from "../../features/commands";
import type { ColumnTab } from "../../platform/panel-tab";
import type { RailTab } from "./panel-rail-model";

interface PanelRailButtonProps {
  readonly entry: RailTab;
  readonly isOn: boolean;
  readonly onPick: (tab: ColumnTab) => void;
}

const PanelRailButton = ({
  entry,
  isOn,
  onPick,
}: PanelRailButtonProps): ReactElement => {
  const pickTab = useCallback(() => onPick(entry.tab), [entry.tab, onPick]);

  return (
    <button
      type="button"
      className="panel-rail-btn"
      aria-label={entry.label}
      aria-pressed={isOn}
      data-tip={tipWithKey(entry.label, entry.keyId)}
      data-tip-side="right"
      onClick={pickTab}
    >
      <Icon name={entry.icon} size={16} />
    </button>
  );
};

export { PanelRailButton };
