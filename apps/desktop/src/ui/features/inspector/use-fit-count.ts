import { useEffect, useLayoutEffect, useReducer } from "react";
import type { MutableRefObject } from "react";

import { toNextShown } from "./breadcrumb-model.js";

const toShownCount = (_current: number, next: number): number => next;

const useFitCount = (
  list: MutableRefObject<HTMLOListElement | null>,
  total: number
): number => {
  const [shown, setShown] = useReducer(toShownCount, total);

  useLayoutEffect(() => {
    const el = list.current;

    if (!el || shown === 0 || el.scrollWidth <= el.clientWidth + 1) {
      return;
    }

    setShown(toNextShown(shown, total, el));
  }, [list, shown, total]);

  useEffect(() => {
    const el = list.current;

    if (!el) {
      return;
    }

    let width = el.clientWidth;

    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) {
        return;
      }

      width = el.clientWidth;
      setShown(total);
    });

    observer.observe(el);

    return (): void => observer.disconnect();
  }, [list, total]);

  return Math.min(shown, total);
};

export { useFitCount };
