import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const useBackdropDismiss = (
  ref: RefObject<HTMLDialogElement | null>,
  onDismiss: () => boolean
): void => {
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const handleMouseDown = (event: MouseEvent): void => {
      if (event.target !== element) {
        return;
      }

      const rect = element.getBoundingClientRect();

      const isInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (!isInside) {
        dismissRef.current();
      }
    };

    element.addEventListener("mousedown", handleMouseDown);

    return (): void => {
      element.removeEventListener("mousedown", handleMouseDown);
    };
  }, [ref]);
};

const useEscapeShield = (ref: RefObject<HTMLDialogElement | null>): void => {
  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
      }
    };

    element.addEventListener("keydown", handleKeyDown);

    return (): void => {
      element.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref]);
};

export { useBackdropDismiss, useEscapeShield };
