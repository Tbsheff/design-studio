import type { KeyboardEvent } from "react";

import { COPY } from "./copy.js";
import { findElements } from "./find-element.js";

const MENU_ITEM_SELECTOR = '[role^="menuitem"]:not(:disabled)';

const toMenuStep = (
  key: string
): ((index: number, count: number) => number) | null => {
  switch (key) {
    case "ArrowDown": {
      return (index, count) => (index + 1) % count;
    }

    case "ArrowUp": {
      return (index, count) => (index - 1 + count) % count;
    }

    case "End": {
      return (_index, count) => count - 1;
    }

    case "Home": {
      return () => 0;
    }

    default: {
      return null;
    }
  }
};

const runMenuKey = (
  event: KeyboardEvent<HTMLDivElement>,
  close: (refocus: boolean) => void
): void => {
  if (event.key === "Tab") {
    close(false);
  }

  const step = toMenuStep(event.key);

  if (!step) {
    return;
  }

  event.preventDefault();

  const items = findElements(event.currentTarget, MENU_ITEM_SELECTOR);
  const { activeElement } = document;
  let active = -1;

  if (activeElement instanceof HTMLElement) {
    active = items.indexOf(activeElement);
  }

  items[step(Math.max(0, active), items.length)]?.focus();
};

const toMoreTip = (isOpen: boolean): string | undefined => {
  if (!isOpen) {
    return COPY.tipMore;
  }
};

const toMenuItemClass = (hint: string | null): string => {
  if (hint) {
    return "ui-menu-item has-hint";
  }

  return "ui-menu-item";
};

export { MENU_ITEM_SELECTOR, runMenuKey, toMenuItemClass, toMoreTip };
