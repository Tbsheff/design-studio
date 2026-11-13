import { useCallback, useState } from "react";

import { uiStore } from "../../platform/storage.js";
import { activeFrame, removeFrame, viewportOf } from "./canvas-frame-ops.js";
import type { CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import type { CanvasFrames } from "./use-canvas-frames.js";
import type { PanZoom } from "./use-pan-zoom.js";

interface RemovalResult {
  before: CanvasLayout | null;
  next: CanvasFrame | null;
}

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
    const active = activeFrame(removed);

    frames.update(() => removed);
    uiStore.set({ viewport: viewportOf(active) });
    frames.activate(active);
    clear();
  };
};

const useFrameRemoval = (frames: CanvasFrames, pz: PanZoom): FrameRemoval => {
  const [removed, setRemoved] = useState<CanvasLayout | null>(null);
  const dismissUndo = useCallback((): void => setRemoved(null), []);

  const removeFrameAt = (frame: CanvasFrame): void => {
    pz.freeze();

    const removal: RemovalResult = { before: null, next: null };

    frames.update((current) => {
      const next = removeFrame(current, frame.id);

      if (next !== current) {
        removal.before = current;
      }

      if (next !== current && frame.id === current.activeId) {
        removal.next = activeFrame(next);
      }

      return next;
    });

    if (removal.before) {
      setRemoved(removal.before);
    }

    if (removal.next) {
      uiStore.set({ viewport: viewportOf(removal.next) });
      frames.activate(removal.next);
    }
  };

  return {
    dismissUndo,
    removeFrameAt,
    undoRemove: toUndo(removed, frames, dismissUndo),
  };
};

export { useFrameRemoval };
