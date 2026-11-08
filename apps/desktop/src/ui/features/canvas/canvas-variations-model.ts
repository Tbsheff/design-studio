import { uiStore } from "../../platform/storage.js";
import {
  activeFrame,
  canvasStore,
  defaultLayout,
  keepDirection,
  placeDirections,
  viewportOf,
} from "./canvas-frames-model.js";
import type { CanvasLayout } from "./canvas-frames-model.js";

const apply = (
  projectId: string,
  fn: (layout: CanvasLayout) => CanvasLayout
): CanvasLayout => {
  const current =
    canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport);

  const next = fn(current);

  if (next !== current) {
    canvasStore.set(projectId, next);
  }

  const active = activeFrame(next);
  const { viewport } = uiStore.get();

  if (active.width !== viewport.width || active.height !== viewport.height) {
    uiStore.set({ viewport: viewportOf(active) });
  }

  return next;
};

const showVariationFrames = (
  projectId: string,
  directionIds: string[],
  currentId: string | null,
  dropCurrent: boolean
): string | null => {
  const next = apply(projectId, (layout) =>
    placeDirections(layout, directionIds, currentId, dropCurrent)
  );

  uiStore.set({ zoom: "fit" });

  return activeFrame(next).directionId ?? currentId;
};

const keepVariationFrame = (
  projectId: string,
  keepId: string,
  groupIds: string[]
): void => {
  apply(projectId, (layout) => keepDirection(layout, keepId, groupIds));
};

const framesOnCanvas = (projectId: string, directionIds: string[]): number => {
  const layout = canvasStore.get(projectId);

  if (layout) {
    return layout.frames.filter(
      (canvasFrame) =>
        canvasFrame.directionId &&
        directionIds.includes(canvasFrame.directionId)
    ).length;
  }

  return 0;
};

export { framesOnCanvas, keepVariationFrame, showVariationFrames };
