import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

import { LEAD_GAP, MIN_FIRST_LINE } from "./comment-composer-model.js";

interface LeadBox {
  inline: boolean;
  width: number;
}

const EMPTY_BOX: LeadBox = { inline: false, width: 0 };

const keepBox = (prev: LeadBox, next: LeadBox): LeadBox => {
  if (prev.width === next.width && prev.inline === next.inline) {
    return prev;
  }

  return next;
};

const measureLead = (lead: HTMLSpanElement | null): LeadBox => {
  const field = lead?.parentElement;

  if (!lead || !field) {
    return EMPTY_BOX;
  }

  const { offsetWidth: width } = lead;

  return {
    inline: width + LEAD_GAP + MIN_FIRST_LINE <= field.clientWidth,
    width,
  };
};

const useLeadWidth = (
  leadRef: RefObject<HTMLSpanElement | null>,
  card: RefObject<HTMLElement | null>
): LeadBox => {
  const [state, setState] = useState<LeadBox>(EMPTY_BOX);

  useLayoutEffect(() => {
    const measure = (): void => {
      const next = measureLead(leadRef.current);
      setState((prev) => keepBox(prev, next));
    };

    measure();
    const observer = new ResizeObserver(measure);

    if (leadRef.current) {
      observer.observe(leadRef.current);
    }

    if (card.current) {
      observer.observe(card.current);
    }

    return (): void => observer.disconnect();
  });

  return state;
};

export { useLeadWidth };

export type { LeadBox };
