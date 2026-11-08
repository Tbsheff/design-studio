import { useCallback, useEffect } from "react";
import type { RefObject } from "react";

import { useConversationContext } from "./conversation-context";

const BOTTOM_THRESHOLD = 24;

const toDistanceFromBottom = (viewport: HTMLElement): number =>
  viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;

const toIsNearBottom = (viewport: HTMLElement): boolean =>
  toDistanceFromBottom(viewport) < BOTTOM_THRESHOLD;

const useBottomTracking = (
  contentRef: RefObject<HTMLDivElement | null>
): (() => void) => {
  const { setIsAtBottom, viewportRef, wasAtBottomRef } =
    useConversationContext();

  const recompute = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const isAtBottom = toIsNearBottom(viewport);

    if (isAtBottom) {
      wasAtBottomRef.current = true;
    }

    setIsAtBottom(isAtBottom);
  }, [viewportRef, setIsAtBottom, wasAtBottomRef]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
    recompute();
  }, [recompute, viewportRef]);

  useEffect(() => {
    const content = contentRef.current;
    const viewport = viewportRef.current;

    if (!content || !viewport) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (wasAtBottomRef.current) {
        viewport.scrollTop = viewport.scrollHeight;
      }

      recompute();
    });

    observer.observe(content);
    observer.observe(viewport);

    return (): void => observer.disconnect();
  }, [contentRef, recompute, viewportRef, wasAtBottomRef]);

  return recompute;
};

export { toIsNearBottom, useBottomTracking };
