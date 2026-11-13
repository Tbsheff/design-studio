import { useCallback, useState } from "react";

import { uiStore } from "../../platform/storage.js";
import { activeFrame, removeFrame, viewportOf } from "./canvas-frame-ops.js";
import type { CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import { toRemovableIds, toRemovedLayout } from "./frame-selection-model.js";
import type { CanvasFrames } from "./use-canvas-frames.js";
import type { PanZoom } from "./use-pan-zoom.js";

interface RemovalResult {
  before: CanvasLayout | null;
  count: number;
  next: CanvasFrame | null;
}

interface Removed {
  readonly count: number;
  readonly layout: CanvasLayout;
}

interface FrameRemoval {
  dismissUndo: () => void;
  removeFrameAt: (frame: CanvasFrame) => void;
  removeFramesAt: (ids: readonly string[]) => void;
  removedCount: number;
  undoRemove: (() => void) | null;
}

const toUndo = (
  removed: Removed | null,
  frames: CanvasFrames,
  clear: () => void
): (() => void) | null => {
  if (!removed) {
    return null;
  }

  return (): void => {
    const active = activeFrame(removed.layout);

    frames.update(() => removed.layout);
    uiStore.set({ viewport: viewportOf(active) });
    frames.activate(active);
    clear();
  };
};

const toRemovedCount = (removed: Removed | null): number => {
  if (!removed) {
    return 0;
  }

  return removed.count;
};

const toFrameCount = (current: CanvasLayout, next: CanvasLayout): number =>
  current.frames.length - next.frames.length;

const useFrameRemoval = (frames: CanvasFrames, pz: PanZoom): FrameRemoval => {
  const [removed, setRemoved] = useState<Removed | null>(null);
  const dismissUndo = useCallback((): void => setRemoved(null), []);

  const applyRemoval = (
    remove: (current: CanvasLayout) => CanvasLayout,
    toCount: (current: CanvasLayout, next: CanvasLayout) => number
  ): void => {
    pz.freeze();

    const removal: RemovalResult = { before: null, count: 0, next: null };

    frames.update((current) => {
      const next = remove(current);

      if (next !== current) {
        removal.before = current;
        removal.count = toCount(current, next);
      }

      if (next !== current && next.activeId !== current.activeId) {
        removal.next = activeFrame(next);
      }

      return next;
    });

    if (removal.before) {
      setRemoved({ count: removal.count, layout: removal.before });
    }

    if (removal.next) {
      uiStore.set({ viewport: viewportOf(removal.next) });
      frames.activate(removal.next);
    }
  };

  const removeFrameAt = (frame: CanvasFrame): void =>
    applyRemoval((current) => removeFrame(current, frame.id), toFrameCount);

  const removeFramesAt = (ids: readonly string[]): void =>
    applyRemoval(
      (current) => toRemovedLayout(current, toRemovableIds(current, ids)),
      toFrameCount
    );

  return {
    dismissUndo,
    removeFrameAt,
    removeFramesAt,
    removedCount: toRemovedCount(removed),
    undoRemove: toUndo(removed, frames, dismissUndo),
  };
};

export { useFrameRemoval };

export type { FrameRemoval };
