import { createLiveStore } from "../../platform/live-store.js";
import type { Box } from "./canvas-frames-model.js";

interface FrameSelection {
  readonly ids: readonly string[];
  readonly projectId: string | null;
}

const EMPTY_SELECTION: FrameSelection = { ids: [], projectId: null };

const frameSelectionStore = createLiveStore<FrameSelection>(EMPTY_SELECTION);

const frameMarqueeStore = createLiveStore<Box | null>(null);

const toSelectedIds = (projectId: string): readonly string[] => {
  const current = frameSelectionStore.get();

  if (current.projectId !== projectId) {
    return [];
  }

  return current.ids;
};

const setSelectedIds = (projectId: string, ids: readonly string[]): void => {
  if (ids.length === 0) {
    frameSelectionStore.set(EMPTY_SELECTION);

    return;
  }

  frameSelectionStore.set({ ids, projectId });
};

const clearFrameSelection = (): boolean => {
  if (frameSelectionStore.get().ids.length === 0) {
    return false;
  }

  frameSelectionStore.set(EMPTY_SELECTION);

  return true;
};

const hasFrameSelection = (): boolean =>
  frameSelectionStore.get().ids.length > 0;

export {
  clearFrameSelection,
  frameMarqueeStore,
  frameSelectionStore,
  hasFrameSelection,
  setSelectedIds,
  toSelectedIds,
};

export type { FrameSelection };
