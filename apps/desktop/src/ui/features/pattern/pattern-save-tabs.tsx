import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { SaveTab } from "./pattern-model.js";
import { PatternTabButton } from "./pattern-tab-button.js";

import styles from "./pattern.module.css";

interface PatternSaveTabsProps {
  readonly hasLayer: boolean;
  readonly onSelect: (tab: SaveTab) => void;
  readonly tab: SaveTab;
}

const PatternSaveTabs = ({
  hasLayer,
  onSelect,
  tab,
}: PatternSaveTabsProps): ReactElement => (
  <div aria-label={copy.title} className={styles.tabs} role="tablist">
    {hasLayer && (
      <PatternTabButton
        id="layer"
        label={copy.tabLayer}
        onSelect={onSelect}
        tab={tab}
      />
    )}
    <PatternTabButton
      id="site"
      label={copy.tabSite}
      onSelect={onSelect}
      tab={tab}
    />
  </div>
);

export { PatternSaveTabs };
