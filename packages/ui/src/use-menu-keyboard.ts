import { useEffect } from "react";

import {
  isTextEntry,
  isTypeaheadKey,
  toMenuItems,
  toNextTyped,
  toOpenMenu,
  toOwnMenu,
  toStepIndex,
  toTypedIndex,
} from "./menu-keys-model.js";
import type { TypedText } from "./menu-keys-model.js";

interface MenuKeyState {
  typed: TypedText;
}

const toTypedTarget = (
  event: KeyboardEvent,
  items: readonly HTMLElement[],
  at: number,
  state: MenuKeyState
): number | null => {
  const hasModifier = event.metaKey || event.ctrlKey || event.altKey;

  if (!isTypeaheadKey(event.key, hasModifier)) {
    return null;
  }

  state.typed = toNextTyped(state.typed, event.key, Date.now());

  return toTypedIndex(items, at, state.typed.text);
};

const toActiveIndex = (items: readonly HTMLElement[]): number => {
  for (const [index, item] of items.entries()) {
    if (item === document.activeElement) {
      return index;
    }
  }

  return -1;
};

const toTriggerIndex = (key: string, count: number): number | null => {
  if (key === "ArrowDown") {
    return 0;
  }

  if (key === "ArrowUp") {
    return count - 1;
  }

  return null;
};

const toTargetIndex = (
  event: KeyboardEvent,
  items: readonly HTMLElement[],
  state: MenuKeyState
): number | null => {
  const at = toActiveIndex(items);
  const isTyping = isTextEntry(event.target);
  const isArrow = event.key === "ArrowDown" || event.key === "ArrowUp";

  if (isTyping && !isArrow) {
    return null;
  }

  const step = toStepIndex(event.key, at, items.length);

  if (step !== null) {
    return step;
  }

  return toTypedTarget(event, items, at, state);
};

const toNextIndex = (
  event: KeyboardEvent,
  own: HTMLElement | null,
  items: readonly HTMLElement[],
  state: MenuKeyState
): number | null => {
  if (own === null) {
    return toTriggerIndex(event.key, items.length);
  }

  return toTargetIndex(event, items, state);
};

const moveMenuFocus = (event: KeyboardEvent, state: MenuKeyState): void => {
  if (event.defaultPrevented) {
    return;
  }

  const own = toOwnMenu(event.target);
  const menu = own ?? toOpenMenu(event.target);

  if (menu === null) {
    return;
  }

  const items = toMenuItems(menu);
  const next = toNextIndex(event, own, items, state);

  if (next === null || items.length === 0) {
    return;
  }

  event.preventDefault();
  items[next]?.focus();
};

const useMenuKeyboard = (): void => {
  useEffect(() => {
    const state: MenuKeyState = { typed: { at: 0, text: "" } };

    const onKey = (event: KeyboardEvent): void => {
      moveMenuFocus(event, state);
    };

    document.addEventListener("keydown", onKey);

    return (): void => {
      document.removeEventListener("keydown", onKey);
    };
  }, []);
};

export { useMenuKeyboard };
