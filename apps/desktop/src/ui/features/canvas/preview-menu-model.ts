import type { IconName } from "@design-studio/ui";
import type { CSSProperties, KeyboardEvent } from "react";

import type { KeyId } from "../../../shared/keymap.js";

interface PreviewMenuItem {
  id: string;
  label: string;
  icon: IconName;
  keyId?: KeyId;
  run: () => void;
  hidden?: boolean;
  disabled?: string;
  divider?: boolean;
}

interface MenuPoint {
  readonly x: number;
  readonly y: number;
}

const EDGE = 8;

const toNextIndex = (
  key: string,
  index: number,
  count: number
): number | null => {
  if (key === "ArrowDown") {
    return (index + 1) % count;
  }

  if (key === "ArrowUp") {
    return (index - 1 + count) % count;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return count - 1;
  }

  return null;
};

const toVisibleItems = (items: PreviewMenuItem[]): PreviewMenuItem[] => {
  const visible: PreviewMenuItem[] = [];

  for (const item of items) {
    if (!item.hidden) {
      visible.push(item);
    }
  }

  return visible;
};

const toClampedPoint = (
  at: MenuPoint,
  width: number,
  height: number
): MenuPoint => {
  const x = Math.max(
    EDGE,
    Math.min(at.x, globalThis.innerWidth - width - EDGE)
  );

  const y = Math.max(
    EDGE,
    Math.min(at.y, globalThis.innerHeight - height - EDGE)
  );

  return { x, y };
};

const isScrolling = (extent: number): boolean =>
  extent > globalThis.innerHeight - EDGE * 2;

const toMenuStyle = (point: MenuPoint): CSSProperties => ({
  left: point.x,
  position: "fixed",
  right: "auto",
  top: point.y,
});

const moveItemFocus = (
  event: KeyboardEvent<HTMLElement>,
  buttons: HTMLButtonElement[]
): void => {
  const next = toNextIndex(
    event.key,
    buttons.indexOf(document.activeElement as HTMLButtonElement),
    buttons.length
  );

  if (next !== null) {
    event.preventDefault();
    buttons[next]?.focus();
  }
};

export {
  moveItemFocus,
  toMenuStyle,
  isScrolling,
  toClampedPoint,
  toNextIndex,
  toVisibleItems,
};

export type { MenuPoint, PreviewMenuItem };
