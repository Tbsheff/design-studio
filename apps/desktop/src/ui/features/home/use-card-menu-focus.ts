import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";

import { toNextMenuIndex } from "./card-menu-model.js";

interface CardMenuFocus {
  readonly rootRef: RefObject<HTMLDivElement | null>;
  readonly registerItem: (button: HTMLButtonElement | null) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

const useCardMenuFocus = (
  onClose: (shouldRefocus: boolean) => void
): CardMenuFocus => {
  const rootRef = useRef<HTMLDivElement>(null);
  const items = useRef(new Set<HTMLButtonElement>());

  const registerItem = useCallback((button: HTMLButtonElement | null): void => {
    if (button) {
      items.current.add(button);
    }
  }, []);

  useEffect(() => {
    const [first] = [...items.current];
    first?.focus();

    const onDown = (event: globalThis.MouseEvent): void => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        onClose(false);
      }
    };

    document.addEventListener("mousedown", onDown);

    return (): void => {
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        onClose(true);

        return;
      }

      const list = [...items.current].filter((button) => button.isConnected);

      const active = document.activeElement;
      let index = -1;

      if (active instanceof HTMLButtonElement) {
        index = list.indexOf(active);
      }

      const next = toNextMenuIndex(event.key, index, list.length);

      if (next === null) {
        return;
      }

      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    },
    [onClose]
  );

  return { onKeyDown, registerItem, rootRef };
};

export { useCardMenuFocus };

export type { CardMenuFocus };
