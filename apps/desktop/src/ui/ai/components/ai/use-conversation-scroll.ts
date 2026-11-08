import { useCallback, useEffect, useRef } from "react";
import type { RefObject, UIEvent } from "react";

import { useConversationContext } from "./conversation-context";
import { listenForManualScroll } from "./scroll-listeners";
import { toIsNearBottom, useBottomTracking } from "./use-bottom-tracking";

interface ConversationScroll {
  readonly contentRef: RefObject<HTMLDivElement | null>;
  readonly handleScroll: (event: UIEvent<HTMLDivElement>) => void;
  readonly viewportRef: RefObject<HTMLDivElement | null>;
}

const useConversationScroll = (): ConversationScroll => {
  const { viewportRef, wasAtBottomRef } = useConversationContext();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const recompute = useBottomTracking(contentRef);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    return listenForManualScroll(viewport, wasAtBottomRef, draggingRef);
  }, [viewportRef, wasAtBottomRef]);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (draggingRef.current) {
        wasAtBottomRef.current = toIsNearBottom(event.currentTarget);
      }

      recompute();
    },
    [recompute, wasAtBottomRef]
  );

  return { contentRef, handleScroll, viewportRef };
};

export { useConversationScroll };
