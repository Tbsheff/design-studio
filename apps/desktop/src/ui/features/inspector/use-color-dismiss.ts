import { placeFixed, showOnTop } from "@design-studio/ui";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, RefObject } from "react";

type Anchor = (trigger: HTMLElement) => HTMLElement;

interface ColorAnchor<View extends string> {
  readonly close: (refocus: boolean) => void;
  readonly open: (next: View) => void;
  readonly panel: RefObject<HTMLElement | null>;
  readonly style: CSSProperties;
  readonly trigger: RefObject<HTMLSpanElement | null>;
  readonly view: View | null;
}

interface DismissRefs {
  readonly panel: RefObject<HTMLElement | null>;
  readonly trigger: RefObject<HTMLElement | null>;
}

const HIDDEN: CSSProperties = {
  left: 0,
  opacity: 0,
  pointerEvents: "none",
  top: 0,
};

const PX_KEYS = new Set(["left", "top", "bottom", "maxHeight", "maxWidth"]);

const SCROLL_EVENT = "scroll";

const RESIZE_EVENT = "resize";

const SCROLL_STYLES = new Set(["auto", "scroll", "overlay"]);

const toKebab = (key: string): string =>
  key.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);

const toCssValue = (key: string, value: string): string => {
  if (PX_KEYS.has(key)) {
    return `${value}px`;
  }

  return value;
};

const applyPlacement = (panel: HTMLElement, target: HTMLElement): void => {
  const placed = placeFixed(target, panel, { align: "end" });
  const { style } = panel;

  style.removeProperty("opacity");
  style.removeProperty("pointer-events");

  for (const [key, value] of Object.entries(placed)) {
    style.setProperty(toKebab(key), toCssValue(key, String(value)));
  }
};

const isInside = (
  target: EventTarget | null,
  nodes: readonly (HTMLElement | null)[]
): boolean =>
  target instanceof Node && nodes.some((node) => node?.contains(target));

const toScrollBox = (node: HTMLElement): HTMLElement | null => {
  let parent = node.parentElement;

  while (parent) {
    if (SCROLL_STYLES.has(getComputedStyle(parent).overflowY)) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
};

const isInView = (trigger: HTMLElement): boolean => {
  const rect = trigger.getBoundingClientRect();
  const box = toScrollBox(trigger);

  if (!box) {
    return rect.bottom > 0 && rect.top < innerHeight;
  }

  const view = box.getBoundingClientRect();

  return rect.bottom > view.top && rect.top < view.bottom;
};

const useColorDismiss = (
  isActive: boolean,
  close: (refocus: boolean) => void,
  refs: DismissRefs,
  replace: () => void
): void => {
  const { panel, trigger } = refs;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const onDown = (event: Event): void => {
      if (!isInside(event.target, [panel.current, trigger.current])) {
        close(false);
      }
    };

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      close(true);
    };

    const onMove = (event: Event): void => {
      const node = trigger.current;

      if (isInside(event.target, [panel.current])) {
        return;
      }

      if (!node?.isConnected || !isInView(node)) {
        close(false);

        return;
      }

      replace();
    };

    document.addEventListener("pointerdown", onDown);
    globalThis.addEventListener("keydown", onKey, true);
    globalThis.addEventListener(SCROLL_EVENT, onMove, true);
    globalThis.addEventListener(RESIZE_EVENT, onMove);

    return (): void => {
      document.removeEventListener("pointerdown", onDown);
      globalThis.removeEventListener("keydown", onKey, true);
      globalThis.removeEventListener(SCROLL_EVENT, onMove, true);
      globalThis.removeEventListener(RESIZE_EVENT, onMove);
    };
  }, [isActive, close, panel, trigger, replace]);
};

const useColorAnchor = <View extends string>(
  anchor: Anchor
): ColorAnchor<View> => {
  const [view, setView] = useState<View | null>(null);
  const trigger = useRef<HTMLSpanElement | null>(null);
  const panel = useRef<HTMLElement | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const open = useCallback((next: View): void => {
    const { activeElement } = document;

    if (
      activeElement instanceof HTMLElement &&
      !panel.current?.contains(activeElement)
    ) {
      returnTo.current = activeElement;
    }

    setView(next);
  }, []);

  const close = useCallback((refocus: boolean): void => {
    setView(null);

    if (refocus) {
      returnTo.current?.focus();
    }
  }, []);

  const replace = useCallback((): void => {
    if (trigger.current && panel.current) {
      applyPlacement(panel.current, anchor(trigger.current));
    }
  }, [anchor]);

  useLayoutEffect(() => {
    if (!view || !trigger.current || !panel.current) {
      return;
    }

    showOnTop(panel.current);
    replace();
  }, [view, replace]);

  useColorDismiss(view !== null, close, { panel, trigger }, replace);

  const style = HIDDEN;

  return { close, open, panel, style, trigger, view };
};

export { useColorAnchor };

export type { ColorAnchor };
