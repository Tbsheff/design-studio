import type { ReactElement } from "react";

import { AppPanelTabButton } from "./app-panel-tab-button";
import { TABS } from "./app-tabs";
import type { Tab } from "./app-tabs";

interface AppPanelTabsProps {
  readonly onSelect: (tab: Tab) => void;
  readonly tab: Tab;
}

const AppPanelTabs = ({ onSelect, tab }: AppPanelTabsProps): ReactElement => (
  <div className="app-panel-tabs segmented" role="tablist">
    {TABS.map((item) => (
      <AppPanelTabButton
        key={item.id}
        id={item.id}
        isSelected={tab === item.id}
        label={item.label}
        onSelect={onSelect}
      />
    ))}
  </div>
);

export { AppPanelTabs };
