import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { InsertTabButton } from "./insert-tab-button.js";
import type { InsertPick } from "./use-insert-panel.js";

interface InsertTabBarProps {
  readonly active: InsertPick;
  readonly onPick: (pick: InsertPick) => void;
}

const TABS: readonly { readonly id: InsertPick; readonly label: string }[] = [
  { id: "components", label: copy.insertComponents },
  { id: "patterns", label: copy.insertSaved },
  { id: "charts", label: copy.insertCharts },
  { id: "blocks", label: copy.insertBlocks },
];

const InsertTabBar = ({ active, onPick }: InsertTabBarProps): ReactElement => (
  <div aria-label={copy.insertTabs} className="pane-insert-tabs" role="tablist">
    {TABS.map((tab) => (
      <InsertTabButton
        key={tab.id}
        active={active}
        id={tab.id}
        label={tab.label}
        onPick={onPick}
      />
    ))}
  </div>
);

export { InsertTabBar };
