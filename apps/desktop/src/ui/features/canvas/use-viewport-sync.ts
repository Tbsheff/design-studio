import { useLayoutEffect, useRef } from "react";

import { uiStore } from "../../platform/storage.js";
import type { Viewport } from "../../platform/storage.js";
import { followDirection } from "./canvas-direction-ops.js";
import {
  activeFrame,
  defaultLayout,
  resizeActive,
  viewportOf,
} from "./canvas-frame-ops.js";
import { canvasStore } from "./canvas-frames-model.js";
import type { CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";

interface Synced {
  projectId: string;
  width: number;
  height: number;
}

interface ViewportSyncInput {
  readonly active: CanvasFrame;
  readonly projectId: string;
  readonly update: (fn: (layout: CanvasLayout) => CanvasLayout) => void;
  readonly viewport: Viewport;
}

interface FollowInput {
  readonly directionId: string | null;
  readonly knownIds: string[] | null;
  readonly layout: CanvasLayout;
  readonly projectId: string;
  readonly viewport: Viewport;
}

const isSizeDifferent = (frame: CanvasFrame, viewport: Viewport): boolean =>
  frame.width !== viewport.width || frame.height !== viewport.height;

const useViewportMirror = ({
  active,
  projectId,
  update,
  viewport,
}: ViewportSyncInput): void => {
  const synced = useRef<Synced | null>(null);

  useLayoutEffect(() => {
    const prev = synced.current;

    const { height, width } = viewport;
    synced.current = { height, projectId, width };

    if (!prev || prev.projectId !== projectId) {
      if (isSizeDifferent(active, viewport)) {
        uiStore.set({ viewport: viewportOf(active) });
      }

      return;
    }

    if (prev.width !== viewport.width || prev.height !== viewport.height) {
      update((layout) => resizeActive(layout, viewport.width, viewport.height));
    }
  });
};

const followBoundDirection = ({
  directionId,
  knownIds,
  projectId,
  viewport,
}: FollowInput): void => {
  if (!directionId) {
    return;
  }

  const current = canvasStore.get(projectId) ?? defaultLayout(viewport);
  const bound = activeFrame(current).directionId;

  if (bound && knownIds && !knownIds.includes(bound)) {
    return;
  }

  const next = followDirection(current, directionId);

  if (next === current) {
    return;
  }

  canvasStore.set(projectId, next);
  const nextActive = activeFrame(next);

  if (isSizeDifferent(nextActive, viewport)) {
    uiStore.set({ viewport: viewportOf(nextActive) });
  }
};

const useDirectionFollow = (input: FollowInput): void => {
  const { directionId, knownIds, layout, projectId, viewport } = input;

  useLayoutEffect(() => {
    followBoundDirection({
      directionId,
      knownIds,
      layout,
      projectId,
      viewport,
    });
  }, [directionId, knownIds, layout, projectId, viewport]);
};

export { useDirectionFollow, useViewportMirror };
