import { TYPEAHEAD_RESET_MS, isPrintable } from "./ui-select-model.js";

const MENU_ITEM_SELECTOR =
  '[role^="menuitem"]:not(:disabled, [aria-disabled="true"])';

const TEXT_ENTRY_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

interface TypedText {
  readonly at: number;
  readonly text: string;
}

const toMenuItems = (root: Element): HTMLElement[] => {
  const items: HTMLElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (
      node instanceof HTMLElement &&
      node.matches(MENU_ITEM_SELECTOR) &&
      node.checkVisibility()
    ) {
      items.push(node);
    }
  }

  return items;
};

const toStepIndex = (key: string, at: number, count: number): number | null => {
  if (key === "ArrowDown") {
    return (at + 1 + count) % count;
  }

  if (key === "ArrowUp") {
    return (Math.max(at, 0) - 1 + count) % count;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return count - 1;
  }

  return null;
};

const toItemLabel = (item: HTMLElement): string =>
  (item.getAttribute("aria-label") ?? item.textContent ?? "")
    .trim()
    .toLowerCase();

const toTypedIndex = (
  items: readonly HTMLElement[],
  at: number,
  text: string
): number | null => {
  const from = Math.max(at, 0) - Number(text.length > 1);

  for (let offset = 1; offset <= items.length; offset += 1) {
    const index = (from + offset + items.length) % items.length;
    const item = items[index];

    if (item && toItemLabel(item).startsWith(text)) {
      return index;
    }
  }

  return null;
};

const toNextTyped = (
  previous: TypedText,
  key: string,
  now: number
): TypedText => {
  if (now - previous.at < TYPEAHEAD_RESET_MS) {
    return { at: now, text: `${previous.text}${key.toLowerCase()}` };
  }

  return { at: now, text: key.toLowerCase() };
};

const isTypeaheadKey = (key: string, hasModifier: boolean): boolean =>
  !hasModifier && isPrintable(key) && key !== " ";

const isTextEntry = (target: EventTarget | null): boolean =>
  target instanceof Element && target.matches(TEXT_ENTRY_SELECTOR);

const MENU_SELECTOR = '[role="menu"]';

const MENU_TRIGGER_SELECTOR = '[aria-haspopup="menu"], [aria-haspopup="true"]';

const toOwnMenu = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  const menu = target.closest(MENU_SELECTOR);

  if (menu instanceof HTMLElement) {
    return menu;
  }

  return null;
};

const toOpenMenu = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element) || !target.matches(MENU_TRIGGER_SELECTOR)) {
    return null;
  }

  let open: HTMLElement | null = null;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT
  );

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (
      node instanceof HTMLElement &&
      node.matches(MENU_SELECTOR) &&
      node.checkVisibility()
    ) {
      open = node;
    }
  }

  return open;
};

export {
  isTextEntry,
  isTypeaheadKey,
  toMenuItems,
  toNextTyped,
  toOpenMenu,
  toOwnMenu,
  toStepIndex,
  toTypedIndex,
};

export type { TypedText };
