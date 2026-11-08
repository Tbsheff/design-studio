import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartTabBarProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

const ChartTabBar = ({ isOpen, onToggle }: ChartTabBarProps): ReactElement => (
  <div aria-label={copy.tabsLabel} className={styles.bar} role="tablist">
    <button
      aria-selected={isOpen}
      className={styles.tab}
      onClick={onToggle}
      role="tab"
      type="button"
    >
      {copy.tabCharts}
    </button>
  </div>
);

export { ChartTabBar };

export type { ChartTabBarProps };
