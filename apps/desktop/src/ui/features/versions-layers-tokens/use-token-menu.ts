import { usePopover } from "@design-studio/ui";
import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";

import { useMenuPlace } from "./use-menu-place.js";
import { runMenuKey } from "./version-menu-model.js";

interface TokenMenu {
  readonly close: (refocus: boolean) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly handleToggle: () => void;
  readonly isOpen: boolean;
  readonly menu: RefObject<HTMLDivElement | null>;
  readonly root: RefObject<HTMLDivElement | null>;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}

const useTokenMenu = (): TokenMenu => {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus: boolean): void => {
    setIsOpen(false);

    if (refocus) {
      trigger.current?.focus({ preventScroll: true });
    }
  }, []);

  usePopover(isOpen, root, close);
  useMenuPlace(isOpen, trigger, menu);

  const handleToggle = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      runMenuKey(event, close);
    },
    [close]
  );

  return { close, handleKeyDown, handleToggle, isOpen, menu, root, trigger };
};

export { useTokenMenu };

export type { TokenMenu };
