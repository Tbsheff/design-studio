import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";

const SCROLL_EVENT = "scroll";
const RESIZE_EVENT = "resize";

const isInside = (
  target: EventTarget | null,
  nodes: readonly RefObject<HTMLElement | null>[]
): boolean =>
  target instanceof Node &&
  nodes.some((node) => Boolean(node.current?.contains(target)));

const toSpot = (root: RefObject<HTMLElement | null>): string => {
  const box = root.current?.getBoundingClientRect();

  if (box) {
    return `${box.top},${box.left}`;
  }

  return "";
};

const useOutsideClose = (
  isOpen: boolean,
  close: () => void,
  root: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>
): void => {
  const onClose = useEffectEvent(close);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const openedAt = toSpot(root);

    const onDown = (event: MouseEvent): void => {
      if (!isInside(event.target, [root, panel])) {
        onClose();
      }
    };

    const onScroll = (event: Event): void => {
      if (!isInside(event.target, [root, panel]) && toSpot(root) !== openedAt) {
        onClose();
      }
    };

    const onResize = (): void => onClose();

    document.addEventListener("mousedown", onDown, true);
    globalThis.addEventListener(SCROLL_EVENT, onScroll, true);
    globalThis.addEventListener(RESIZE_EVENT, onResize);

    return (): void => {
      document.removeEventListener("mousedown", onDown, true);
      globalThis.removeEventListener(SCROLL_EVENT, onScroll, true);
      globalThis.removeEventListener(RESIZE_EVENT, onResize);
    };
  }, [isOpen, root, panel]);
};

export { useOutsideClose };
