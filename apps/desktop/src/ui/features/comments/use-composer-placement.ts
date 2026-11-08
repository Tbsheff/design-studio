import { useState } from "react";
import type { RefObject } from "react";

import type { ComposerProps } from "./comment-composer-model.js";
import { placeComposer, useCardSize } from "./comment-placement.js";
import type { CardSide, ComposerPlacement } from "./comment-placement.js";

const toPrefer = (side: CardSide | null): CardSide | undefined => {
  if (side === null) {
    return;
  }

  return side;
};

const useComposerPlacement = (
  props: ComposerProps,
  card: RefObject<HTMLElement | null>
): ComposerPlacement => {
  const size = useCardSize(card);
  const [prefer, setPrefer] = useState<CardSide | null>(null);

  const placement = placeComposer(
    props.anchor,
    { card: size, frame: props.frame, zoom: props.zoom },
    toPrefer(prefer),
    props.offset
  );

  if (prefer !== placement.side) {
    setPrefer(placement.side);
  }

  return placement;
};

export { useComposerPlacement };
