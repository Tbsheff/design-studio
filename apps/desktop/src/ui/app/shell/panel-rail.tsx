import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { tipWithKey } from "../../features/commands";
import { setRailToggled, useRail } from "../../features/home/index.js";
import type { ColumnTab, EditorColumn } from "../../platform/panel-tab";
import { copy } from "./copy";
import { PanelRailButton } from "./panel-rail-button";
import { RAIL_TABS } from "./panel-rail-model";

interface PanelRailProps {
  readonly column: EditorColumn;
  readonly onPick: (tab: ColumnTab) => void;
}

const PanelRail = ({ column, onPick }: PanelRailProps): ReactElement => {
  const rail = useRail();

  return (
    <nav className="panel-rail" aria-label={copy.panelRail}>
      {RAIL_TABS.map((entry) => (
        <PanelRailButton
          key={entry.tab}
          entry={entry}
          isOn={column.isOpen && column.tab === entry.tab}
          onPick={onPick}
        />
      ))}
      <span className="panel-rail-gap" />
      <button
        type="button"
        className="panel-rail-btn"
        aria-label={copy.projectList}
        aria-pressed={rail === "open"}
        data-tip={tipWithKey(copy.projectList, "project-rail")}
        data-tip-side="right"
        onClick={setRailToggled}
      >
        <Icon name="sidebar" size={16} />
      </button>
    </nav>
  );
};

export { PanelRail };
