import type { CanvasGuide } from "@design-studio/contracts/canvas-file";

import type { SnapGuide, SpacingBadge } from "./snap-model.js";

interface FrameSnapView {
  readonly guides: SnapGuide[];
  readonly spacing: SpacingBadge[];
  readonly shift: { readonly x: number; readonly y: number };
}

interface FrameSnapStore {
  readonly get: () => FrameSnapView;
  readonly set: (next: FrameSnapView | null) => void;
  readonly subscribe: (listener: () => void) => () => boolean;
}

const EMPTY_SNAP: FrameSnapView = {
  guides: [],
  shift: { x: 0, y: 0 },
  spacing: [],
};

const createSnapStore = (): FrameSnapStore => {
  let view = EMPTY_SNAP;
  const subs = new Set<() => void>();

  return {
    get: () => view,
    set: (next: FrameSnapView | null) => {
      view = next ?? EMPTY_SNAP;

      for (const listener of subs) {
        listener();
      }
    },
    subscribe: (listener: () => void) => {
      subs.add(listener);

      return (): boolean => subs.delete(listener);
    },
  };
};

const frameSnapStore = createSnapStore();

interface SnapLineStore {
  readonly get: () => readonly CanvasGuide[];
  readonly set: (next: readonly CanvasGuide[]) => void;
}

const NO_LINES: readonly CanvasGuide[] = [];

const createLineStore = (): SnapLineStore => {
  let lines = NO_LINES;

  return {
    get: () => lines,
    set: (next: readonly CanvasGuide[]) => {
      lines = next;
    },
  };
};

const snapLineStore = createLineStore();

export { NO_LINES, frameSnapStore, snapLineStore };

export type { FrameSnapView };
