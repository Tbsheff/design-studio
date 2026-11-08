import { usePopover } from "@design-studio/ui";
import { useCallback, useRef, useState } from "react";
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
  SetStateAction,
} from "react";

import { toMenuItems } from "./menu-items-model.js";

interface FrameMenu {
  readonly close: (refocus: boolean) => void;
  readonly open: boolean;
  readonly root: RefObject<HTMLDivElement | null>;
  readonly setOpen: Dispatch<SetStateAction<boolean>>;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}

const toMenuStep = (
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

  if (key === "End") {
    return count - 1;
  }

  if (key === "Home") {
    return 0;
  }

  return null;
};

const menuKeys = (
  event: ReactKeyboardEvent<HTMLElement>,
  close: (refocus: boolean) => void
): void => {
  if (event.key === "Tab") {
    close(false);
  }

  const items = toMenuItems(event.currentTarget);
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const target = toMenuStep(event.key, Math.max(0, index), items.length);

  if (target === null) {
    return;
  }

  event.preventDefault();
  items[target]?.focus();
};

const useMenu = (): FrameMenu => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, root, close);

  return { close, open, root, setOpen, trigger };
};

export { menuKeys, useMenu };
