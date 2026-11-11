import { usePopover } from "@design-studio/ui";
import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";

interface DraftChipApi {
  readonly chipRef: RefObject<HTMLButtonElement | null>;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly rootRef: RefObject<HTMLDivElement | null>;
}

const useDraftChip = (): DraftChipApi => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);

  const onClose = useCallback((refocus: boolean): void => {
    setIsOpen(false);

    if (refocus) {
      chipRef.current?.focus();
    }
  }, []);

  const onToggle = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  usePopover(isOpen, rootRef, onClose);

  return { chipRef, isOpen, onToggle, rootRef };
};

export { useDraftChip };

export type { DraftChipApi };
