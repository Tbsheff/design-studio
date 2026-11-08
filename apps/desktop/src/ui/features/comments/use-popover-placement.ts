import { useState } from "react";
import type { RefObject } from "react";

import { placeComposer, useCardSize } from "./comment-placement.js";
import type {
  CardSide,
  ComposerPlacement,
  PinOffset,
} from "./comment-placement.js";
import type { SelectionContext } from "./deps.js";

interface PopoverPlace {
  readonly anchor: SelectionContext["rect"];
  readonly frame: { width: number; height: number };
  readonly offset: PinOffset | undefined;
  readonly zoom: number;
}

const toPrefer = (side: CardSide | null): CardSide | undefined => {
  if (side === null) {
    return;
  }

  return side;
};

const usePopoverPlacement = (
  place: PopoverPlace,
  card: RefObject<HTMLElement | null>
): ComposerPlacement => {
  const size = useCardSize(card);
  const [prefer, setPrefer] = useState<CardSide | null>(null);

  const placement = placeComposer(
    place.anchor,
    { card: size, frame: place.frame, zoom: place.zoom },
    toPrefer(prefer),
    place.offset
  );

  if (prefer !== placement.side) {
    setPrefer(placement.side);
  }

  return placement;
};

export { usePopoverPlacement };

export type { PopoverPlace };
