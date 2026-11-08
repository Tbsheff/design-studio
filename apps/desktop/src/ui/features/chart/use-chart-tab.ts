import { useCallback, useState } from "react";

interface ChartTabState {
  readonly close: () => void;
  readonly isOpen: boolean;
  readonly toggle: () => void;
}

const useChartTab = (): ChartTabState => {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback((): void => setIsOpen(false), []);
  const toggle = useCallback((): void => setIsOpen((value) => !value), []);

  return { close, isOpen, toggle };
};

export { useChartTab };

export type { ChartTabState };
