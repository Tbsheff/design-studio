import { usePopover } from "@design-studio/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

interface RowMenuState {
  readonly isOpen: boolean;
  readonly rootRef: RefObject<HTMLDivElement | null>;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly firstItemRef: RefObject<HTMLButtonElement | null>;
  readonly toggle: () => void;
  readonly close: () => void;
}

const useRowMenu = (): RowMenuState => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const closeWithFocus = useCallback((isRefocus: boolean) => {
    setIsOpen(false);

    if (isRefocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const close = useCallback(() => closeWithFocus(false), [closeWithFocus]);
  const toggle = useCallback(() => setIsOpen((current) => !current), []);
  usePopover(isOpen, rootRef, closeWithFocus);
  useEffect(() => {
    if (isOpen) {
      firstItemRef.current?.focus();
    }
  }, [isOpen]);

  return { close, firstItemRef, isOpen, rootRef, toggle, triggerRef };
};

export { useRowMenu };

export type { RowMenuState };
