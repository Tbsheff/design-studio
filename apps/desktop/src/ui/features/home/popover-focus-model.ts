import { findElements } from "../../platform/find-element.js";

const FOCUS_ITEMS =
  ".ui-menu-item:not(:disabled), .home-pack-card:not(:disabled), .btn:not(:disabled)";

const MENU_ITEMS = ".ui-menu-item";

interface FocusKeyEvent {
  readonly key: string;
  readonly currentTarget: EventTarget | null;
  readonly preventDefault: () => void;
}

const toNextFocusIndex = (
  key: string,
  at: number,
  count: number
): number | null => {
  if (key === "ArrowDown") {
    return at + 1;
  }

  if (key === "ArrowUp") {
    return at - 1;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return count - 1;
  }

  return null;
};

const moveFocus = (event: FocusKeyEvent, selector: string): void => {
  if (!(event.currentTarget instanceof HTMLElement)) {
    return;
  }

  const items = findElements(event.currentTarget, selector);
  const at = items.indexOf(document.activeElement as HTMLElement);
  const next = toNextFocusIndex(event.key, at, items.length);

  if (next === null || items.length === 0) {
    return;
  }

  event.preventDefault();
  items[(next + items.length) % items.length]?.focus();
};

const moveFocusInItems = (event: FocusKeyEvent): void => {
  moveFocus(event, FOCUS_ITEMS);
};

const moveFocusInMenu = (event: FocusKeyEvent): void => {
  moveFocus(event, MENU_ITEMS);
};

export {
  FOCUS_ITEMS,
  MENU_ITEMS,
  moveFocus,
  moveFocusInItems,
  moveFocusInMenu,
};

export type { FocusKeyEvent };
