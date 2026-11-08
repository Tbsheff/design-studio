import { useModalDialog } from "@design-studio/ui";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const isOutside = (event: MouseEvent, dialog: HTMLDialogElement): boolean => {
  const rect = dialog.getBoundingClientRect();

  return !(
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
};

const useHomeDialog = (
  onDismiss: () => boolean
): RefObject<HTMLDialogElement | null> => {
  const { ref } = useModalDialog(onDismiss);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    const dialog = ref.current;

    if (!dialog) {
      return;
    }

    const onMouseDown = (event: MouseEvent): void => {
      if (event.target === dialog && isOutside(event, dialog)) {
        dismissRef.current();
      }
    };

    dialog.addEventListener("mousedown", onMouseDown);

    return (): void => dialog.removeEventListener("mousedown", onMouseDown);
  }, [ref]);

  return ref;
};

export { useHomeDialog };
