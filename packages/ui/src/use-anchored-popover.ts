import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, RefObject } from "react";

import { placeFixed, writeFixed } from "./popover-placement.js";

const HIDDEN: CSSProperties = {
  left: 0,
  opacity: 0,
  pointerEvents: "none",
  top: 0,
};

const SCROLL_EVENT = "scroll";
const RESIZE_EVENT = "resize";

interface AnchoredPopover<
  View extends string,
  Panel extends HTMLElement = HTMLDivElement,
> {
  readonly close: (refocus: boolean) => void;
  readonly open: (next: View) => void;
  readonly panel: RefObject<Panel | null>;
  readonly style: CSSProperties;
  readonly trigger: RefObject<HTMLSpanElement | null>;
  readonly view: View | null;
}

const toAnchor = (
  trigger: HTMLElement,
  anchor: ((trigger: HTMLElement) => HTMLElement) | null
): HTMLElement => {
  if (anchor) {
    return anchor(trigger);
  }

  return trigger;
};

const isInside = (
  target: EventTarget | null,
  nodes: readonly (HTMLElement | null)[]
): boolean =>
  target instanceof Node && nodes.some((node) => node?.contains(target));

const useDismiss = (
  isActive: boolean,
  close: (refocus: boolean) => void,
  panel: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLElement | null>
): void => {
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

    document.addEventListener("mousedown", onDown);
    globalThis.addEventListener("keydown", onKey, true);
    globalThis.addEventListener(SCROLL_EVENT, onDown, true);
    globalThis.addEventListener(RESIZE_EVENT, onDown);

    return (): void => {
      document.removeEventListener("mousedown", onDown);
      globalThis.removeEventListener("keydown", onKey, true);
      globalThis.removeEventListener(SCROLL_EVENT, onDown, true);
      globalThis.removeEventListener(RESIZE_EVENT, onDown);
    };
  }, [isActive, close, panel, trigger]);
};

const useAnchoredPopover = <
  View extends string,
  Panel extends HTMLElement = HTMLDivElement,
>(
  anchor: ((trigger: HTMLElement) => HTMLElement) | null = null
): AnchoredPopover<View, Panel> => {
  const [view, setView] = useState<View | null>(null);
  const trigger = useRef<HTMLSpanElement | null>(null);
  const panel = useRef<Panel | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const open = useCallback((next: View) => {
    const { activeElement } = document;

    if (
      activeElement instanceof HTMLElement &&
      !panel.current?.contains(activeElement)
    ) {
      returnTo.current = activeElement;
    }

    setView(next);
  }, []);

  const close = useCallback((refocus: boolean) => {
    setView(null);

    if (refocus) {
      returnTo.current?.focus();
    }
  }, []);

  useLayoutEffect(() => {
    if (!view || !trigger.current || !panel.current) {
      return;
    }

    const target = toAnchor(trigger.current, anchor);

    writeFixed(
      panel.current,
      placeFixed(target, panel.current, { align: "end" })
    );
  }, [view, anchor]);

  useDismiss(view !== null, close, panel, trigger);

  const style = HIDDEN;

  return { close, open, panel, style, trigger, view };
};

export { useAnchoredPopover };

export type { AnchoredPopover };
