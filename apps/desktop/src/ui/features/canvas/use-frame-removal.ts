import { useCallback, useState } from "react";

import { uiStore } from "../../platform/storage.js";
import { activeFrame, removeFrame, viewportOf } from "./canvas-frame-ops.js";
import type { CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import type { CanvasFrames } from "./use-canvas-frames.js";
import type { PanZoom } from "./use-pan-zoom.js";

interface FrameRemoval {
  dismissUndo: () => void;
  removeFrameAt: (frame: CanvasFrame) => void;
  undoRemove: (() => void) | null;
}

const toUndo = (
  removed: CanvasLayout | null,
  frames: CanvasFrames,
  clear: () => void
): (() => void) | null => {
  if (!removed) {
    return null;
  }

  return (): void => {
    frames.update(() => removed);
    uiStore.set({ viewport: viewportOf(activeFrame(removed)) });
    clear();
  };
};

const useFrameRemoval = (frames: CanvasFrames, pz: PanZoom): FrameRemoval => {
  const { layout } = frames;
  const [removed, setRemoved] = useState<CanvasLayout | null>(null);
  const dismissUndo = useCallback((): void => setRemoved(null), []);

  const removeFrameAt = (frame: CanvasFrame): void => {
    pz.freeze();
    const next = removeFrame(layout, frame.id);
    setRemoved(layout);
    frames.update(() => next);

    if (frame.id === layout.activeId) {
      uiStore.set({ viewport: viewportOf(activeFrame(next)) });
    }
  };

  return {
    dismissUndo,
    removeFrameAt,
    undoRemove: toUndo(removed, frames, dismissUndo),
  };
};

export { useFrameRemoval };
