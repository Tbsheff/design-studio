import type { KeyboardEvent, RefObject } from "react";

import type { MenuGroup } from "./top-bar-menu-model.js";

const toFocusableIds = (groups: MenuGroup[]): string[] => {
  const ids: string[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      if (!item.disabled) {
        ids.push(item.id);
      }
    }
  }

  return ids;
};

const moveMenuFocus = (
  event: KeyboardEvent<HTMLDivElement>,
  ids: string[],
  refs: RefObject<Map<string, HTMLButtonElement>>
): void => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }

  const buttons: HTMLButtonElement[] = [];

  for (const id of ids) {
    const button = refs.current.get(id);

    if (button?.checkVisibility()) {
      buttons.push(button);
    }
  }

  let at = -1;

  for (const [index, button] of buttons.entries()) {
    if (button === document.activeElement) {
      at = index;
    }
  }

  event.preventDefault();

  let operand: 1 | -1 = -1;

  if (event.key === "ArrowDown") {
    operand = 1;
  }

  buttons[(at + operand + buttons.length) % buttons.length]?.focus();
};

export { moveMenuFocus, toFocusableIds };
