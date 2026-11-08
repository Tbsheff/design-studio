import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";

import { SCREEN_CREATE_EVENT } from "../../domain/screen-events.js";
import { toMenuItems } from "./menu-items-model.js";

interface AddFrameState {
  readonly button: RefObject<HTMLButtonElement | null>;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly menu: RefObject<HTMLDivElement | null>;
  readonly open: boolean;
  readonly openScreen: () => void;
  readonly pick: (size: { width: number; height: number }) => void;
  readonly screenLabel: string;
  readonly toggle: () => void;
}

const SCREEN_LABEL = "New screen…";

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

interface MenuRefs {
  readonly button: RefObject<HTMLButtonElement | null>;
  readonly menu: RefObject<HTMLDivElement | null>;
}

const useMenuDismiss = (
  open: boolean,
  refs: MenuRefs,
  setOpen: (value: boolean) => void
): void => {
  const { button, menu } = refs;

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
  }, [open, button, menu, setOpen]);
};

const useAddFrameMenu = (
  onAdd: (size: { width: number; height: number }) => void
): AddFrameState => {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useMenuDismiss(open, { button, menu }, setOpen);

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

  const openScreen = useCallback((): void => {
    close(true);
    globalThis.dispatchEvent(new CustomEvent(SCREEN_CREATE_EVENT));
  }, [close]);

  const pick = useCallback(
    (size: { width: number; height: number }): void => {
      close(true);
      onAdd(size);
    },
    [close, onAdd]
  );

  const screenLabel = SCREEN_LABEL;

  return {
    button,
    handleKeyDown,
    menu,
    open,
    openScreen,
    pick,
    screenLabel,
    toggle,
  };
};

export { useAddFrameMenu };

export type { AddFrameState };
