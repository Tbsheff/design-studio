import { useCallback, useState } from "react";

interface BlockTabState {
  readonly close: () => void;
  readonly isOpen: boolean;
  readonly toggle: () => void;
}

const useBlockTab = (): BlockTabState => {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback((): void => setIsOpen(false), []);
  const toggle = useCallback((): void => setIsOpen((value) => !value), []);

  return { close, isOpen, toggle };
};

export { useBlockTab };

export type { BlockTabState };
