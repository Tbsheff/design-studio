import { useEffect } from "react";

import { useLatest } from "../../platform/use-latest.js";
import type { Box, CanvasLayout } from "./canvas-frames-model.js";
import { toGroupFrames, toGroupRect } from "./frame-selection-model.js";
import { clearFrameZoom, frameZoomStore } from "./frame-zoom-store.js";

interface FrameZoomInput {
  readonly active: Box;
  readonly layout: CanvasLayout;
  readonly projectId: string;
  readonly zoomToBox: (box: Box) => void;
}

const toZoomBox = (input: FrameZoomInput): Box | null => {
  const request = frameZoomStore.get();

  if (request === null || request.projectId !== input.projectId) {
    return null;
  }

  const group = toGroupRect(toGroupFrames(input.layout, request.ids));

  if (group === null) {
    return null;
  }

  const { active } = input;

  return { ...group, x: group.x - active.x, y: group.y - active.y };
};

const useFrameZoom = (input: FrameZoomInput): void => {
  const latest = useLatest(input);

  useEffect(
    () =>
      frameZoomStore.subscribe((): void => {
        const box = toZoomBox(latest.current);

        if (box === null) {
          return;
        }

        clearFrameZoom();
        latest.current.zoomToBox(box);
      }),
    [latest]
  );
};

export { useFrameZoom };
