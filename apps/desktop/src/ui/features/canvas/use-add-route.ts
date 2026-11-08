import { useCallback } from "react";

import { addRouteFrame, routeFrameId } from "./app-canvas-routes-model.js";
import { canAddFrame } from "./canvas-frame-ops.js";
import type { CanvasLayout } from "./canvas-frames-model.js";

interface AddRouteInput {
  readonly focus: () => void;
  readonly freeze: () => void;
  readonly layout: CanvasLayout;
  readonly notify: (message: string) => void;
  readonly size: { width: number; height: number };
  readonly update: (fn: (layout: CanvasLayout) => CanvasLayout) => void;
}

const useAddRoute = (input: AddRouteInput): ((route: string) => void) => {
  const { focus, freeze, layout, notify, size, update } = input;

  return useCallback(
    (route: string): void => {
      const isShown = routeFrameId(layout, route) !== null;

      if (!isShown && !canAddFrame(layout)) {
        notify(
          "The canvas has the most frames it can hold. Remove one to add this route."
        );

        return;
      }

      freeze();
      update((current) => addRouteFrame(current, route, size));
      focus();

      if (isShown) {
        notify(`${route} is already on the canvas. Showing it.`);
      } else {
        notify(`Added a frame for ${route}`);
      }
    },
    [layout, notify, freeze, update, size, focus]
  );
};

export { useAddRoute };

export type { AddRouteInput };
