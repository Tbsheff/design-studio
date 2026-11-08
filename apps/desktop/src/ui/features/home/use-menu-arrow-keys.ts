import { useEffect } from "react";
import type { RefObject } from "react";

import { moveFocus } from "./popover-focus-model.js";

const useMenuArrowKeys = (
  target: RefObject<HTMLElement | null>,
  selector: string
): void => {
  useEffect(() => {
    const { current } = target;

    if (!current) {
      return;
    }

    const handleKey = (event: KeyboardEvent): void => {
      moveFocus(event, selector);
    };

    current.addEventListener("keydown", handleKey);

    return (): void => current.removeEventListener("keydown", handleKey);
  }, [target, selector]);
};

export { useMenuArrowKeys };
