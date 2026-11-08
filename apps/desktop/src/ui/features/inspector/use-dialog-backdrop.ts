import { useEffect } from "react";
import type { RefObject } from "react";

const isPointInside = (event: MouseEvent, rect: DOMRect): boolean =>
  event.clientX >= rect.left &&
  event.clientX <= rect.right &&
  event.clientY >= rect.top &&
  event.clientY <= rect.bottom;

const useDialogBackdrop = (
  ref: RefObject<HTMLDialogElement | null>,
  onDismiss: () => void
): void => {
  useEffect(() => {
    const element = ref.current;

    const handleMouseDown = (event: MouseEvent): void => {
      if (!element || event.target !== element) {
        return;
      }

      if (!isPointInside(event, element.getBoundingClientRect())) {
        onDismiss();
      }
    };

    element?.addEventListener("mousedown", handleMouseDown);

    return (): void => {
      element?.removeEventListener("mousedown", handleMouseDown);
    };
  }, [ref, onDismiss]);
};

export { useDialogBackdrop };
