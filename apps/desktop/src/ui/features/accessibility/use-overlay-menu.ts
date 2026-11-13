import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";

interface OverlayMenu {
  readonly button: RefObject<HTMLButtonElement | null>;
  readonly handleClose: () => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly isOpen: boolean;
  readonly menu: RefObject<HTMLDivElement | null>;
  readonly handleToggle: () => void;
}

const useOverlayMenu = (): OverlayMenu => {
  const [isOpen, setIsOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    menu.current?.focus();

    const onDown = (event: MouseEvent): void => {
      const { target } = event;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        !menu.current?.contains(target) &&
        !button.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);

    return (): void => document.removeEventListener("mousedown", onDown);
  }, [isOpen]);

  const handleClose = useCallback((): void => {
    setIsOpen(false);
    button.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
      }
    },
    [handleClose]
  );

  const handleToggle = useCallback(() => setIsOpen((value) => !value), []);

  return { button, handleClose, handleKeyDown, handleToggle, isOpen, menu };
};

export { useOverlayMenu };

export type { OverlayMenu };
