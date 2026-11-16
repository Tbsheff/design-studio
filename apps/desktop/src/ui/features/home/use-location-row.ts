import { useCallback, useRef, useState } from "react";

import { useFocusRequest } from "./use-focus-request.js";

interface LocationRow {
  readonly isShown: boolean;
  readonly attachRow: (node: HTMLDivElement | null) => void;
  readonly handleLocationPick: (path: string | null) => void;
}

const runRowFocus = (node: HTMLDivElement): void => {
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.focus();
};

const useLocationRow = (
  location: string | null,
  onLocation: (path: string | null) => void
): LocationRow => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const isFocusDue = useRef(false);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((): void => {
    setIsOpen(true);

    if (rowRef.current === null) {
      isFocusDue.current = true;

      return;
    }

    runRowFocus(rowRef.current);
  }, []);

  useFocusRequest("location", open);

  const attachRow = useCallback((node: HTMLDivElement | null): void => {
    rowRef.current = node;

    if (node !== null && isFocusDue.current) {
      isFocusDue.current = false;
      runRowFocus(node);
    }
  }, []);

  const handleLocationPick = useCallback(
    (path: string | null): void => {
      onLocation(path);

      if (path === null) {
        setIsOpen(false);
      }
    },
    [onLocation]
  );

  return {
    attachRow,
    handleLocationPick,
    isShown: isOpen || location !== null,
  };
};

export { useLocationRow };

export type { LocationRow };
