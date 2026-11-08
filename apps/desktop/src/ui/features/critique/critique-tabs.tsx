import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { CritiqueTab } from "./critique-model.js";
import { CritiqueTabButton } from "./critique-tab-button.js";

import styles from "./critique.module.css";

interface TabsProps {
  readonly onSelect: (tab: CritiqueTab) => void;
  readonly tab: CritiqueTab;
}

const CritiqueTabs = ({ onSelect, tab }: TabsProps): ReactElement => (
  <div className={styles.tabs}>
    <div aria-label={copy.tabsLabel} className="segmented" role="tablist">
      <CritiqueTabButton
        id="scores"
        isSelected={tab === "scores"}
        label={copy.scoresTab}
        onSelect={onSelect}
      />
      <CritiqueTabButton
        id="attention"
        isSelected={tab === "attention"}
        label={copy.attention.tab}
        onSelect={onSelect}
      />
    </div>
  </div>
);

export { CritiqueTabs };
