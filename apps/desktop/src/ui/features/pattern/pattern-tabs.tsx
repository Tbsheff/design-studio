import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { InsertTab } from "./pattern-model.js";
import { PatternTabButton } from "./pattern-tab-button.js";

import styles from "./pattern.module.css";

interface PatternTabsProps {
  readonly onSelect: (tab: InsertTab) => void;
  readonly tab: InsertTab | null;
}

const PatternTabs = ({ onSelect, tab }: PatternTabsProps): ReactElement => (
  <div aria-label={copy.tabsLabel} className={styles.tabs} role="tablist">
    <PatternTabButton
      id="components"
      label={copy.tabComponents}
      onSelect={onSelect}
      tab={tab}
    />
    <PatternTabButton
      id="patterns"
      label={copy.tabPatterns}
      onSelect={onSelect}
      tab={tab}
    />
  </div>
);

export { PatternTabs };

export type { PatternTabsProps };
