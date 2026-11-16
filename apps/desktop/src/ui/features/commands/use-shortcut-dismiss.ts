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
    const onPointer = (event: PointerEvent): void => {
      if (isOutside(event, rootRef)) {
        onClose();
      }
    };

    globalThis.addEventListener("pointerdown", onPointer, true);

    return (): void => {
      globalThis.removeEventListener("pointerdown", onPointer, true);
    };
  }, [onClose, rootRef]);
};

export { useShortcutDismiss };
