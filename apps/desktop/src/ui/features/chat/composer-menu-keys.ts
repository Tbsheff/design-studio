import type { KeyboardEvent } from "react";

import { findElements } from "../../platform/find-element.js";
import { ITEM } from "./composer-menu-model.js";

const toStep = (key: string): number => {
  if (key === "ArrowDown" || key === "ArrowRight") {
    return 1;
  }

  if (key === "ArrowUp" || key === "ArrowLeft") {
    return -1;
  }

  return 0;
};

const toEdgeIndex = (key: string, length: number): number => {
  if (key === "Home") {
    return 0;
  }

  return length - 1;
};

const menuKeys = (
  event: KeyboardEvent<HTMLDivElement>,
  close: (refocus: boolean) => void
): void => {
  const items = findElements(event.currentTarget, ITEM);
  const at = items.indexOf(document.activeElement as HTMLElement);
  const step = toStep(event.key);

  if (step !== 0) {
    event.preventDefault();
    items[(at + step + items.length) % items.length]?.focus();

    return;
  }

  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    items[toEdgeIndex(event.key, items.length)]?.focus();

    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    close(true);
  }
};

export { menuKeys };
