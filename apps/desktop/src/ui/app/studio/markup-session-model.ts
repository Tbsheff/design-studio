import { activeFrame, canvasStore, defaultLayout } from "../../features/canvas";
import type { MarkupRect, MarkupTarget } from "../../features/markup";
import { findElement } from "../../platform/find-element";
import { uiStore } from "../../platform/storage";

interface MarkupSession {
  readonly rect: MarkupRect;
  readonly target: MarkupTarget;
}

const toFrameSelector = (frameId: string): string => {
  const id = CSS.escape(frameId);

  return `.artboard[data-frame-id="${id}"], .canvas-frame[data-frame-id="${id}"]`;
};

const toMarkupSession = (
  project: string,
  directionId: string | null
): MarkupSession | null => {
  const frame = activeFrame(
    canvasStore.get(project) ?? defaultLayout(uiStore.get().viewport)
  );

  const owner = frame.directionId ?? directionId;
  const element = findElement(document.body, toFrameSelector(frame.id));

  if (owner === null || element === null) {
    return null;
  }

  const bounds = element.getBoundingClientRect();

  return {
    rect: {
      height: bounds.height,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
    },
    target: {
      directionId: owner,
      frameId: frame.id,
      height: frame.height,
      projectId: project,
      width: frame.width,
    },
  };
};

export { toMarkupSession };

export type { MarkupSession };
