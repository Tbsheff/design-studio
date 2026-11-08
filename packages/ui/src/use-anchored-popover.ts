import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";

import { placeFixed } from "./popover-placement.js";

const HIDDEN: CSSProperties = {
  left: 0,
  opacity: 0,
  pointerEvents: "none",
  top: 0,
};

export function useAnchoredPopover<T extends string>(
  anchor?: (trigger: HTMLElement) => HTMLElement
) {
  const [view, setView] = useState<T | null>(null);
  const [style, setStyle] = useState<CSSProperties>(HIDDEN);
  const trigger = useRef<HTMLSpanElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const open = useCallback((next: T) => {
    if (
      document.activeElement instanceof HTMLElement &&
      !panel.current?.contains(document.activeElement)
    ) {
      returnTo.current = document.activeElement;
    }

    setView(next);
  }, []);

  const close = useCallback((refocus: boolean) => {
    setView(null);
    setStyle(HIDDEN);

    if (refocus) {
      returnTo.current?.focus();
    }
  }, []);

  useLayoutEffect(() => {
    if (!view || !trigger.current || !panel.current) {
      return;
    }

    setStyle(
      placeFixed(
        anchor ? anchor(trigger.current) : trigger.current,
        panel.current,
        { align: "end" }
      )
    );
  }, [view, anchor]);

  useEffect(() => {
    if (!view) {
      return;
    }

    const inside = (target: EventTarget | null): boolean | undefined =>
      target instanceof Node &&
      (panel.current?.contains(target) || trigger.current?.contains(target));

    const onDown = (e: Event): void => {
      if (!inside(e.target)) {
        close(false);
      }
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      close(true);
    };

    const onScroll = onDown;

    document.addEventListener("mousedown", onDown);
    globalThis.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    return (): void => {
      document.removeEventListener("mousedown", onDown);
      globalThis.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [view, close]);

  return { close, open, panel, style, trigger, view };
}
