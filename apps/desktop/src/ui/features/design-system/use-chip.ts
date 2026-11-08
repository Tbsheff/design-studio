import { useFitPopover, usePopover } from "@design-studio/ui";
import type { RefObject } from "react";
import { useCallback, useRef, useState } from "react";

import type { ChipDialog } from "./chip-model.js";

interface ChipControl {
  readonly close: (shouldRefocus: boolean) => void;
  readonly closeDialog: () => void;
  readonly dialog: ChipDialog;
  readonly isOpen: boolean;
  readonly openChange: () => void;
  readonly openDialog: (next: ChipDialog) => void;
  readonly popover: RefObject<HTMLDialogElement | null>;
  readonly root: RefObject<HTMLDivElement | null>;
  readonly toggle: () => void;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}

const useChip = (): ChipControl => {
  const [isOpen, setIsOpen] = useState(false);
  const [dialog, setDialog] = useState<ChipDialog>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDialogElement>(null);

  const close = useCallback((shouldRefocus: boolean): void => {
    setIsOpen(false);

    if (shouldRefocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(isOpen, root, close);
  useFitPopover(popover, trigger, isOpen);

  const openDialog = useCallback(
    (next: ChipDialog): void => {
      close(false);
      setDialog(next);
    },
    [close]
  );

  const closeDialog = useCallback((): void => {
    setDialog(null);
  }, []);

  const openChange = useCallback((): void => {
    setDialog("change");
  }, []);

  const toggle = useCallback((): void => {
    if (isOpen) {
      close(false);

      return;
    }

    setIsOpen(true);
  }, [close, isOpen]);

  return {
    close,
    closeDialog,
    dialog,
    isOpen,
    openChange,
    openDialog,
    popover,
    root,
    toggle,
    trigger,
  };
};

export { useChip };

export type { ChipControl };
