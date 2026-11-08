import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./block.module.css";

interface BlockTabBarProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

const BlockTabBar = ({ isOpen, onToggle }: BlockTabBarProps): ReactElement => (
  <div aria-label={copy.tabsLabel} className={styles.bar} role="tablist">
    <button
      aria-selected={isOpen}
      className={styles.tab}
      onClick={onToggle}
      role="tab"
      type="button"
    >
      {copy.tabBlocks}
    </button>
  </div>
);

export { BlockTabBar };

export type { BlockTabBarProps };
