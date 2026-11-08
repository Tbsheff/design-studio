import { findElements } from "../../platform/find-element.js";

const RAIL_ITEM_SELECTOR = ".prail-item";

const toNextRailIndex = (at: number, key: string, count: number): number => {
  if (at === -1) {
    return 0;
  }

  let step = -1;

  if (key === "ArrowDown") {
    step = 1;
  }

  return (at + step + count) % count;
};

const moveRailFocus = (event: KeyboardEvent, rail: HTMLElement): void => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }

  const items = findElements(rail, RAIL_ITEM_SELECTOR);
  const active = document.activeElement;
  const at = items.indexOf(active as HTMLElement);

  if (at === -1 && !(active instanceof HTMLInputElement)) {
    return;
  }

  event.preventDefault();
  items[toNextRailIndex(at, event.key, items.length)]?.focus();
};

export { moveRailFocus };
