import type { KeyboardEvent } from "react";

import { findElements } from "./deps.js";

const focusables = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) {
    return [];
  }

  return findElements(root, "input, textarea, button:not(:disabled)").filter(
    (element) => element.tabIndex >= 0
  );
};

const trapTab = (event: KeyboardEvent, root: HTMLElement | null): void => {
  if (event.key !== "Tab") {
    return;
  }

  const items = focusables(root);
  const [first] = items;
  const last = items.at(-1);

  if (!first || !last) {
    return;
  }

  const isFirst = document.activeElement === first;
  const isLast = document.activeElement === last;

  if (event.shiftKey && isFirst) {
    event.preventDefault();
    last.focus();
  }

  if (!event.shiftKey && isLast) {
    event.preventDefault();
    first.focus();
  }
};

export { focusables, trapTab };
