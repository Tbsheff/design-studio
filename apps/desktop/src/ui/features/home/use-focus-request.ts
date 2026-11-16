import { useEffect } from "react";

import { startFocusWatch } from "./focus-bus-model.js";
import type { FocusRequest, FocusTarget } from "./focus-bus-model.js";

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

export { useFocusRequest };
