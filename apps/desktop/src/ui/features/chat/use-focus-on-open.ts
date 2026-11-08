import { useEffect } from "react";
import type { RefObject } from "react";

import { findElement } from "../../platform/find-element.js";

const useFocusOnOpen = (
  open: boolean,
  panel: RefObject<HTMLElement | null>,
  selectors: readonly string[]
): void => {
  useEffect(() => {
    if (!open || !panel.current) {
      return;
    }

    for (const selector of selectors) {
      const found = findElement(panel.current, selector);

      if (found) {
        found.focus();

        return;
      }
    }
  }, [open, panel, selectors]);
};

export { useFocusOnOpen };
