import { useCallback } from "react";

import { useBlockTab } from "../features/block/index.js";
import { useChartTab } from "../features/chart/index.js";
import { useInsertTab } from "../features/pattern/index.js";
import type { InsertTab } from "../features/pattern/index.js";

interface InsertPanelState {
  readonly isBlockOpen: boolean;
  readonly isChartOpen: boolean;
  readonly isPatternsOpen: boolean;
  readonly onBlockToggle: () => void;
  readonly onChartToggle: () => void;
  readonly onSelect: (tab: InsertTab) => void;
  readonly tab: InsertTab | null;
}

const toShownTab = (isOtherOpen: boolean, tab: InsertTab): InsertTab | null => {
  if (isOtherOpen) {
    return null;
  }

  return tab;
};

const useInsertPanel = (): InsertPanelState => {
  const { select, tab: insertTab } = useInsertTab();
  const chartTab = useChartTab();
  const blockTab = useBlockTab();
  const closeChart = chartTab.close;
  const closeBlock = blockTab.close;
  const toggleChart = chartTab.toggle;
  const toggleBlock = blockTab.toggle;

  const onChartToggle = useCallback((): void => {
    closeBlock();
    toggleChart();
  }, [closeBlock, toggleChart]);

  const onBlockToggle = useCallback((): void => {
    closeChart();
    toggleBlock();
  }, [closeChart, toggleBlock]);

  const onSelect = useCallback(
    (next: InsertTab): void => {
      closeChart();
      closeBlock();
      select(next);
    },
    [closeBlock, closeChart, select]
  );

  const isBlockOpen = blockTab.isOpen;
  const isChartOpen = chartTab.isOpen;
  const isPatternsOpen = insertTab === "patterns";
  const tab = toShownTab(isBlockOpen || isChartOpen, insertTab);

  return {
    isBlockOpen,
    isChartOpen,
    isPatternsOpen,
    onBlockToggle,
    onChartToggle,
    onSelect,
    tab,
  };
};

export { useInsertPanel };

export type { InsertPanelState };
