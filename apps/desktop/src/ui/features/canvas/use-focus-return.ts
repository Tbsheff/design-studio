import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

const toOpener = (): HTMLElement | null => {
  const { activeElement } = document;

  if (activeElement instanceof HTMLElement && activeElement !== document.body) {
    return activeElement;
  }

  return null;
};

const restoreFocus = (
  opener: HTMLElement | null,
  fallback: () => void
): void => {
  if (document.activeElement && document.activeElement !== document.body) {
    return;
  }

  if (opener?.isConnected) {
    opener.focus({ preventScroll: true });

    return;
  }

  fallback();
};

const useFocusReturn = (
  root: RefObject<HTMLElement | null>,
  fallback: () => void
): void => {
  const fallbackRef = useRef(fallback);
  useLayoutEffect(() => {
    fallbackRef.current = fallback;
  });

  useEffect(() => {
    const opener = toOpener();
    root.current?.focus();

    return (): void => {
      globalThis.requestAnimationFrame(() =>
        restoreFocus(opener, fallbackRef.current)
      );
    };
  }, [root]);
};

export { useFocusReturn };
