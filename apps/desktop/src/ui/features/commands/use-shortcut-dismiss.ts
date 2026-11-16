import { useEffect } from "react";
import type { RefObject } from "react";

const isOutside = (
  event: PointerEvent,
  rootRef: RefObject<HTMLElement | null>
): boolean =>
  event.target instanceof Node &&
  rootRef.current !== null &&
  !rootRef.current.contains(event.target);

const useShortcutDismiss = (
  rootRef: RefObject<HTMLElement | null>,
  onClose: () => void
): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    const onPointer = (event: PointerEvent): void => {
      if (isOutside(event, rootRef)) {
        onClose();
      }
    };

    globalThis.addEventListener("keydown", onKey, true);
    globalThis.addEventListener("pointerdown", onPointer, true);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey, true);
      globalThis.removeEventListener("pointerdown", onPointer, true);
    };
  }, [onClose, rootRef]);
};

export { useShortcutDismiss };
