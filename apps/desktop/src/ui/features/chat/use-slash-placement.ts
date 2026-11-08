import { useLayoutEffect, useState } from "react";
import type { CSSProperties } from "react";

import { pick } from "../../platform/pick.js";
import { useLatest } from "../../platform/use-latest.js";
import { GAP, MAX_HEIGHT } from "./slash-menu-model.js";

const SCROLL_EVENT = "scroll";
const MIN_ROOM = 96;
const EDGE_ROOM = 8;

const HIDDEN: CSSProperties = { position: "fixed", visibility: "hidden" };

const toPlacement = (card: DOMRect): CSSProperties => {
  const above = card.top - GAP;
  const below = window.innerHeight - card.bottom - GAP;
  const isUp = above >= MAX_HEIGHT || above >= below;
  const free = pick(isUp, above, below) - EDGE_ROOM;
  const room = Math.max(MIN_ROOM, Math.min(MAX_HEIGHT, free));

  return {
    left: card.left,
    maxHeight: room,
    position: "fixed",
    width: card.width,
    ...pick(
      isUp,
      { bottom: window.innerHeight - card.top + GAP },
      { top: card.bottom + GAP }
    ),
  };
};

const useSlashPlacement = (anchor: () => HTMLElement | null): CSSProperties => {
  const [style, setStyle] = useState<CSSProperties>(HIDDEN);
  const anchorRef = useLatest(anchor);

  useLayoutEffect(() => {
    const place = (): void => {
      const card = anchorRef.current()?.getBoundingClientRect();

      if (card) {
        setStyle(toPlacement(card));
      }
    };

    place();
    const observer = new ResizeObserver(place);
    const card = anchorRef.current();

    if (card) {
      observer.observe(card);
    }

    observer.observe(document.documentElement);
    document.addEventListener(SCROLL_EVENT, place, true);

    return (): void => {
      observer.disconnect();
      document.removeEventListener(SCROLL_EVENT, place, true);
    };
  }, [anchorRef]);

  return style;
};

export { useSlashPlacement };
