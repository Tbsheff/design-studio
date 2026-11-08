import { useCallback, useEffect } from "react";
import type { KeyboardEvent, RefObject } from "react";

import { findElement } from "./deps.js";
import { focusables, trapTab } from "./focus-trap-model.js";

const toFocusTarget = (card: HTMLElement | null): HTMLElement | null => {
  if (!card) {
    return null;
  }

  return (
    findElement(card, "textarea:not(:disabled)") ?? focusables(card)[0] ?? null
  );
};

const applyKey = (
  event: KeyboardEvent<HTMLElement>,
  root: RefObject<HTMLElement | null>,
  onClose: () => void
): void => {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    onClose();

    return;
  }

  trapTab(event, root.current);
};

const usePopoverKeys = (
  root: RefObject<HTMLElement | null>,
  onClose: () => void
): ((event: KeyboardEvent<HTMLElement>) => void) => {
  useEffect(() => {
    toFocusTarget(root.current)?.focus({ preventScroll: true });
  }, [root]);

  return useCallback(
    (event: KeyboardEvent<HTMLElement>): void => applyKey(event, root, onClose),
    [onClose, root]
  );
};

export { usePopoverKeys };
