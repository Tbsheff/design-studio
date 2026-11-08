import { useLayoutEffect } from "react";
import type { RefObject } from "react";

import { findElement } from "./find-element.js";
import { MENU_ITEM_SELECTOR } from "./version-menu-model.js";

const MENU_GAP = 4;
const MENU_EDGE = 8;

const toMenuTop = (button: DOMRect, height: number): number => {
  const below = button.bottom + MENU_GAP;

  if (below + height > globalThis.innerHeight - MENU_EDGE) {
    return Math.max(MENU_EDGE, button.top - MENU_GAP - height);
  }

  return Math.max(MENU_EDGE, below);
};

const useMenuPlace = (
  isOpen: boolean,
  trigger: RefObject<HTMLButtonElement | null>,
  menuRef: RefObject<HTMLDivElement | null>
): void => {
  useLayoutEffect(() => {
    const button = trigger.current?.getBoundingClientRect();
    const menu = menuRef.current;

    if (!isOpen || !button || !menu) {
      return;
    }

    const maxLeft = globalThis.innerWidth - menu.offsetWidth - MENU_EDGE;
    const left = Math.max(MENU_EDGE, Math.min(button.left, maxLeft));

    menu.style.left = `${left}px`;
    menu.style.top = `${toMenuTop(button, menu.offsetHeight)}px`;
    menu.style.visibility = "";
    findElement(menu, MENU_ITEM_SELECTOR)?.focus({ preventScroll: true });
  }, [isOpen, trigger, menuRef]);
};

export { useMenuPlace };
