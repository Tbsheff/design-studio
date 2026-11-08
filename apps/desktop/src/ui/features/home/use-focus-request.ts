import { useEffect } from "react";
import type { RefObject } from "react";

import { startFocusWatch } from "./focus-bus-model.js";
import type { FocusRequest, FocusTarget } from "./focus-bus-model.js";

const FOCUS_DELAY_MS = 60;

const useFocusRequest = (
  target: FocusTarget,
  onRequest: (request: FocusRequest) => void
): void => {
  useEffect(
    () =>
      startFocusWatch((request) => {
        if (request.target === target) {
          onRequest(request);
        }
      }),
    [onRequest, target]
  );
};

const useFocusElement = (
  target: FocusTarget,
  ref: RefObject<HTMLElement | null>
): void => {
  useEffect(
    () =>
      startFocusWatch((request) => {
        if (request.target !== target) {
          return;
        }

        globalThis.setTimeout(() => {
          ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          ref.current?.focus();
        }, FOCUS_DELAY_MS);
      }),
    [ref, target]
  );
};

export { useFocusElement, useFocusRequest };
