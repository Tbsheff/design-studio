import { useEffect, useLayoutEffect } from "react";
import type { RefObject } from "react";

import { isPopoverBehindModal, toActiveElement } from "./focus-model.js";

const usePopover = (
  open: boolean,
  root: RefObject<HTMLElement | null>,
  onClose: (refocus: boolean) => void,
  trigger?: RefObject<HTMLElement | null>
): void => {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onDown = (event: MouseEvent): void => {
      const { target } = event;

      if (!(target instanceof Node)) {
        return;
      }

      if (trigger?.current?.contains(target)) {
        return;
      }

      if (root.current && !root.current.contains(target)) {
        onClose(false);
      }
    };

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      if (isPopoverBehindModal(root.current)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    };

    document.addEventListener("mousedown", onDown);
    globalThis.addEventListener("keydown", onKey, true);

    return (): void => {
      document.removeEventListener("mousedown", onDown);
      globalThis.removeEventListener("keydown", onKey, true);
    };
  }, [open, root, onClose, trigger]);
};

const useReturnFocusOnUnmount = (): void => {
  useLayoutEffect(() => {
    const opener = toActiveElement();

    return (): void => {
      if (opener?.isConnected) {
        opener.focus();
      }
    };
  }, []);
};

export { usePopover, useReturnFocusOnUnmount };
