import { useCallback, useState } from "react";
import type { MouseEvent, RefObject } from "react";

import type { MenuAt } from "./project-card-model.js";

interface CardMenuState {
  readonly menu: MenuAt;
  readonly closeMenu: (shouldRefocus: boolean) => void;
  readonly openKeyMenu: () => void;
  readonly toggleMenu: () => void;
  readonly onContextMenu: (event: MouseEvent<HTMLDivElement>) => void;
}

const useCardMenu = (
  cardRef: RefObject<HTMLDivElement | null>,
  openRef: RefObject<HTMLButtonElement | null>
): CardMenuState => {
  const [menu, setMenu] = useState<MenuAt>(null);

  const closeMenu = useCallback(
    (shouldRefocus: boolean): void => {
      setMenu(null);

      if (shouldRefocus) {
        openRef.current?.focus();
      }
    },
    [openRef]
  );

  const openKeyMenu = useCallback((): void => {
    setMenu("keys");
  }, []);

  const toggleMenu = useCallback((): void => {
    setMenu((current) => {
      if (current) {
        return null;
      }

      return "button";
    });
  }, []);

  const onContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      event.preventDefault();
      const box = cardRef.current?.getBoundingClientRect();

      if (box) {
        setMenu(
          new DOMPoint(event.clientX - box.left, event.clientY - box.top)
        );
      } else {
        setMenu("button");
      }
    },
    [cardRef]
  );

  return { closeMenu, menu, onContextMenu, openKeyMenu, toggleMenu };
};

export { useCardMenu };

export type { CardMenuState };
