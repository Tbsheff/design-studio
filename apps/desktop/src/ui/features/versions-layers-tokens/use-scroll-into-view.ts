import { useEffect } from "react";
import type { RefObject } from "react";

import { ROW } from "./layers-constants.js";

const toScrollTop = (current: number, height: number, top: number): number => {
  if (top < current) {
    return top;
  }

  if (top + ROW > current + height) {
    return top + ROW - height;
  }

  return current;
};

const useScrollIntoView = (
  listRef: RefObject<HTMLDivElement | null>,
  selectedIndex: number
): void => {
  useEffect(() => {
    const element = listRef.current;

    if (!element || selectedIndex < 0) {
      return;
    }

    element.scrollTop = toScrollTop(
      element.scrollTop,
      element.clientHeight,
      selectedIndex * ROW
    );
  }, [listRef, selectedIndex]);
};

export { useScrollIntoView };
