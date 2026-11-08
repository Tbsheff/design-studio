import { useEffect } from "react";
import type { RefObject } from "react";

const useDismissPopover = (
  isOpen: boolean,
  popRef: RefObject<HTMLElement | null>,
  toggleRef: RefObject<HTMLElement | null>,
  onClose: () => void
): void => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      onClose();
      toggleRef.current?.focus();
    };

    const onDown = (event: MouseEvent): void => {
      const { target } = event;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        !popRef.current?.contains(target) &&
        !toggleRef.current?.contains(target)
      ) {
        onClose();
      }
    };

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener("mousedown", onDown);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener("mousedown", onDown);
    };
  }, [isOpen, onClose, popRef, toggleRef]);
};

export { useDismissPopover };
