import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./image-search.module.css";

type SheetTab = "generate" | "search";

interface SheetTabsProps {
  readonly onPick: (tab: SheetTab) => void;
  readonly tab: SheetTab;
}

const GENERATE_LABEL = "Generate";

const SheetTabs = ({ onPick, tab }: SheetTabsProps): ReactElement => {
  const handleSearch = useCallback((): void => {
    onPick("search");
  }, [onPick]);

  const handleGenerate = useCallback((): void => {
    onPick("generate");
  }, [onPick]);

  return (
    <div aria-label={copy.find} className={styles.tabs} role="tablist">
      <button
        aria-selected={tab === "search"}
        className={styles.tab}
        role="tab"
        type="button"
        onClick={handleSearch}
      >
        {copy.search}
      </button>
      <button
        aria-selected={tab === "generate"}
        className={styles.tab}
        role="tab"
        type="button"
        onClick={handleGenerate}
      >
        {GENERATE_LABEL}
      </button>
    </div>
  );
};

export { SheetTabs };

export type { SheetTab };
