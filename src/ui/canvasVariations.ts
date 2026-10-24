import { activeFrame, canvasStore, defaultLayout, keepDirection, placeDirections, viewportOf, type CanvasLayout } from './canvasFrames';
import { uiStore } from './storage';

function apply(projectId: string, fn: (layout: CanvasLayout) => CanvasLayout): CanvasLayout {
  const current = canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport);
  const next = fn(current);
  if (next !== current) canvasStore.set(projectId, next);
  const active = activeFrame(next);
  const { viewport } = uiStore.get();
  if (active.width !== viewport.width || active.height !== viewport.height) uiStore.set({ viewport: viewportOf(active) });
  return next;
}

export function showVariationFrames(projectId: string, directionIds: string[], currentId: string | null, dropCurrent: boolean): string | null {
  const next = apply(projectId, (layout) => placeDirections(layout, directionIds, currentId, dropCurrent));
  uiStore.set({ zoom: 'fit' });
  return activeFrame(next).directionId ?? currentId;
}

export function keepVariationFrame(projectId: string, keepId: string, groupIds: string[]): void {
  apply(projectId, (layout) => keepDirection(layout, keepId, groupIds));
}

export function framesOnCanvas(projectId: string, directionIds: string[]): number {
  const layout = canvasStore.get(projectId);
  return layout ? layout.frames.filter((f) => f.directionId && directionIds.includes(f.directionId)).length : 0;
}
