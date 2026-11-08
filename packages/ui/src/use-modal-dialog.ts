import { useCallback, useEffectEvent, useLayoutEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";

import {
  toActiveElement,
  toAutofocusTarget,
  toFirstFocusable,
  toModalBody,
} from "./focus-model.js";

interface ModalDialog {
  readonly onMouseDown: (event: ReactMouseEvent<HTMLDialogElement>) => void;
  readonly ref: RefObject<HTMLDialogElement | null>;
}

const focusFirst = (dialog: HTMLDialogElement): void => {
  const target =
    toAutofocusTarget(dialog) ??
    toFirstFocusable(toModalBody(dialog)) ??
    toFirstFocusable(dialog);

  target?.focus();
};

const isOutside = (
  event: ReactMouseEvent<HTMLDialogElement>,
  rect: DOMRect
): boolean => {
  const isInsideX = event.clientX >= rect.left && event.clientX <= rect.right;
  const isInsideY = event.clientY >= rect.top && event.clientY <= rect.bottom;

  return !(isInsideX && isInsideY);
};

const useModalDialog = (
  onDismiss: (() => boolean) | (() => void)
): ModalDialog => {
  const ref = useRef<HTMLDialogElement>(null);
  const dismiss = useEffectEvent(onDismiss);

  useLayoutEffect(() => {
    const dialog = ref.current;

    if (!dialog) {
      return;
    }

    const opener = toActiveElement();

    if (!dialog.open) {
      dialog.showModal();
    }

    focusFirst(dialog);

    const onCancel = (event: Event): void => {
      event.preventDefault();
      dismiss();
    };

    const onClose = (): void => {
      if (dialog.open) {
        return;
      }

      if (dismiss() === false && dialog.isConnected) {
        dialog.showModal();
      }
    };

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onClose);

    return (): void => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onClose);

      if (dialog.open) {
        dialog.close();
      }

      if (opener?.isConnected) {
        opener.focus();
      }
    };
  }, []);

  const onMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDialogElement>): void => {
      if (event.target !== event.currentTarget) {
        return;
      }

      if (isOutside(event, event.currentTarget.getBoundingClientRect())) {
        onDismiss();
      }
    },
    [onDismiss]
  );

  return { onMouseDown, ref };
};

export { useModalDialog };

export type { ModalDialog };
