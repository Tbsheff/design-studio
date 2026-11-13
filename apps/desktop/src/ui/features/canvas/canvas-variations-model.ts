import { uiStore } from "../../platform/storage.js";
import { keepDirection, placeDirections } from "./canvas-direction-ops.js";
import { activeFrame, defaultLayout, viewportOf } from "./canvas-frame-ops.js";
import { canvasStore } from "./canvas-frames-model.js";
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
): CanvasLayout | null => {
  const before = canvasStore.get(projectId) ?? null;

  const next = apply(projectId, (layout) =>
    keepDirection(layout, keepId, groupIds)
  );

  if (next === before) {
    return null;
  }

  return before;
};

const restoreVariationFrames = (
  projectId: string,
  before: CanvasLayout
): void => {
  apply(projectId, () => before);
};

const framesOnCanvas = (projectId: string, directionIds: string[]): number => {
  const layout = canvasStore.get(projectId);

  if (layout) {
    const wanted = new Set(directionIds);

    return layout.frames.filter(
      (canvasFrame) =>
        canvasFrame.directionId && wanted.has(canvasFrame.directionId)
    ).length;
  }

  return 0;
};

export {
  framesOnCanvas,
  keepVariationFrame,
  restoreVariationFrames,
  showVariationFrames,
};
