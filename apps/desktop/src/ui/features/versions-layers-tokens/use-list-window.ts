import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject, UIEvent } from "react";

import { DEFAULT_LIST_HEIGHT, ROW } from "./layers-constants.js";

interface ScrollWindow {
  readonly height: number;
  readonly top: number;
}

interface ListWindowApi {
  readonly onScroll: (event: UIEvent<HTMLDivElement>) => void;
  readonly scroll: ScrollWindow;
}

interface ListWindowInput {
  readonly initialTop: number;
  readonly isReady: boolean;
  readonly onScrollTop: (top: number) => void;
}

const isSameWindow = (first: ScrollWindow, second: ScrollWindow): boolean =>
  Math.floor(first.top / ROW) === Math.floor(second.top / ROW) &&
  Math.ceil((first.top + first.height) / ROW) ===
    Math.ceil((second.top + second.height) / ROW);

const useListWindow = (
  listRef: RefObject<HTMLDivElement | null>,
  input: ListWindowInput
): ListWindowApi => {
  const { initialTop, isReady, onScrollTop } = input;

  const [scroll, setScroll] = useState<ScrollWindow>({
    height: DEFAULT_LIST_HEIGHT,
    top: initialTop,
  });

  const updateScroll = useCallback((next: ScrollWindow): void => {
    setScroll((previous) => {
      if (isSameWindow(previous, next)) {
        return previous;
      }

      return next;
    });
  }, []);

  const isRestored = useRef(false);

  useLayoutEffect(() => {
    const element = listRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((): void => {
      updateScroll({ height: element.clientHeight, top: element.scrollTop });
    });

    observer.observe(element);

    return (): void => observer.disconnect();
  }, [listRef, updateScroll]);

  useLayoutEffect(() => {
    const element = listRef.current;

    if (!element || !isReady || isRestored.current) {
      return;
    }

    isRestored.current = true;
    element.scrollTop = initialTop;
  }, [listRef, initialTop, isReady]);

  const onScroll = useCallback(
    (event: UIEvent<HTMLDivElement>): void => {
      onScrollTop(event.currentTarget.scrollTop);
      updateScroll({
        height: event.currentTarget.clientHeight,
        top: event.currentTarget.scrollTop,
      });
    },
    [onScrollTop, updateScroll]
  );

  return { onScroll, scroll };
};

export { useListWindow };
