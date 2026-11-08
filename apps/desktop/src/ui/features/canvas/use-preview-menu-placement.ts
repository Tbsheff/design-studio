import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { isScrolling, toClampedPoint } from "./preview-menu-model.js";
import type { MenuPoint } from "./preview-menu-model.js";

interface MenuPlacement {
  readonly point: MenuPoint;
  readonly isScrollable: boolean;
}

const measureExtent = (element: HTMLElement): number => {
  const last = element.lastElementChild as HTMLElement | null;

  if (last) {
    return last.offsetTop + last.offsetHeight;
  }

  return element.offsetHeight;
};

const usePreviewMenuPlacement = (
  root: RefObject<HTMLDivElement | null>,
  at: MenuPoint,
  focusFirst: () => void
): MenuPlacement => {
  const [point, setPoint] = useState(at);
  const [isScrollable, setIsScrollable] = useState(false);

  useLayoutEffect(() => {
    const element = root.current;

    if (!element) {
      return;
    }

    const clamp = (): void => {
      setIsScrollable(isScrolling(measureExtent(element)));
      setPoint(toClampedPoint(at, element.offsetWidth, element.offsetHeight));
    };

    clamp();
    focusFirst();
    const observer = new ResizeObserver(clamp);
    observer.observe(element);

    return (): void => observer.disconnect();
  }, [at, root, focusFirst]);

  return { isScrollable, point };
};

const useMenuDismiss = (
  root: RefObject<HTMLDivElement | null>,
  onClose: () => void
): void => {
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (!root.current?.contains(event.target as Node)) {
        closeRef.current();
      }
    };

    const onBlur = (): void => closeRef.current();
    let isFirstResize = true;

    const observer = new ResizeObserver(() => {
      if (isFirstResize) {
        isFirstResize = false;

        return;
      }

      closeRef.current();
    });

    observer.observe(document.documentElement);
    globalThis.addEventListener("mousedown", onDown, true);
    globalThis.addEventListener("blur", onBlur);

    return (): void => {
      observer.disconnect();
      globalThis.removeEventListener("mousedown", onDown, true);
      globalThis.removeEventListener("blur", onBlur);
    };
  }, [root]);
};

export { useMenuDismiss, usePreviewMenuPlacement };
