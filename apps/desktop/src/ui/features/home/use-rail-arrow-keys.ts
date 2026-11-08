import { useEffect } from "react";
import type { RefObject } from "react";

import { moveRailFocus } from "./rail-focus-model.js";

const useRailArrowKeys = (rail: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const element = rail.current;

    if (!element) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
      moveRailFocus(event, element);
    };

    element.addEventListener("keydown", onKey);

    return (): void => {
      element.removeEventListener("keydown", onKey);
    };
  }, [rail]);
};

export { useRailArrowKeys };
