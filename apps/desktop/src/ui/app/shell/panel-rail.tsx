import type { ReactElement } from "react";

import type { ColumnTab, EditorColumn } from "../../platform/panel-tab";
import { copy } from "./copy";
import { PanelRailButton } from "./panel-rail-button";
import { RAIL_TABS } from "./panel-rail-model";

interface PanelRailProps {
  readonly column: EditorColumn;
  readonly onPick: (tab: ColumnTab) => void;
}

const PanelRail = ({ column, onPick }: PanelRailProps): ReactElement => (
  <nav className="panel-rail" aria-label={copy.panelRail}>
    {RAIL_TABS.map((entry) => (
      <PanelRailButton
        key={entry.tab}
        entry={entry}
        isOn={column.isOpen && column.tab === entry.tab}
        onPick={onPick}
      />
    ))}
  </nav>
);

export { PanelRail };
