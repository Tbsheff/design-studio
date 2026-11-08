import { useModalDialog } from "@design-studio/ui";
import { useEffect } from "react";
import type { RefObject } from "react";

const isOutside = (event: MouseEvent, element: HTMLDialogElement): boolean => {
  if (event.target !== element) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
};

const useBackdropDialog = (
  onDismiss: () => void
): RefObject<HTMLDialogElement | null> => {
  const { ref } = useModalDialog(onDismiss);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const onMouseDown = (event: MouseEvent): void => {
      if (isOutside(event, element)) {
        onDismiss();
      }
    };

    element.addEventListener("mousedown", onMouseDown);

    return (): void => element.removeEventListener("mousedown", onMouseDown);
  }, [ref, onDismiss]);

  return ref;
};

export { useBackdropDialog };
