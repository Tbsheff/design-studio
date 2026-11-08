import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { findElement } from "../../platform/find-element.js";
import type { RailState } from "./rail-store-model.js";

const STAGE_SELECTOR = ".canvas .stage";

const useStageFocusOnClose = (
  state: RailState,
  rail: RefObject<HTMLElement | null>
): void => {
  const last = useRef(state);
  useEffect(() => {
    const isClosed = last.current === "open" && state !== "open";
    last.current = state;

    if (!isClosed) {
      return;
    }

    const active = document.activeElement;

    if (active && active !== document.body && !rail.current?.contains(active)) {
      return;
    }

    findElement(document.body, STAGE_SELECTOR)?.focus({ preventScroll: true });
  }, [state, rail]);
};

export { useStageFocusOnClose };
