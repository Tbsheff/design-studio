import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";

import { toMenuItems } from "./menu-items-model.js";

interface AddFrameState {
  readonly button: RefObject<HTMLButtonElement | null>;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly menu: RefObject<HTMLDivElement | null>;
  readonly open: boolean;
  readonly pick: (size: { width: number; height: number }) => void;
  readonly toggle: () => void;
}

const toNextIndex = (
  key: string,
  index: number,
  count: number
): number | null => {
  if (key === "ArrowDown") {
    return index + 1;
  }

  if (key === "ArrowUp") {
    return index - 1;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return count - 1;
  }

  return null;
};

const useAddFrameMenu = (
  onAdd: (size: { width: number; height: number }) => void
): AddFrameState => {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (menu.current) {
      toMenuItems(menu.current)[0]?.focus();
    }

    const onDown = (event: MouseEvent): void => {
      const target = event.target as Node;

      if (
        !menu.current?.contains(target) &&
        !button.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);

    return (): void => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = useCallback((refocus: boolean): void => {
    setOpen(false);

    if (refocus) {
      button.current?.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        close(true);

        return;
      }

      const items = toMenuItems(event.currentTarget);
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = toNextIndex(event.key, index, items.length);

      if (next === null) {
        return;
      }

      event.preventDefault();
      items[(next + items.length) % items.length]?.focus();
    },
    [close]
  );

  const toggle = useCallback(() => setOpen((value) => !value), []);

  const pick = useCallback(
    (size: { width: number; height: number }): void => {
      close(true);
      onAdd(size);
    },
    [close, onAdd]
  );

  return { button, handleKeyDown, menu, open, pick, toggle };
};

export { useAddFrameMenu };

export type { AddFrameState };
