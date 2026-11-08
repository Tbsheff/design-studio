import type { CanvasService } from "../../canvas/index.js";
import type { CanvasFileFrame, Direction, Project } from "./deps.js";
import { frameOf } from "./frame.js";
import type { AccessibilityFrame } from "./frame.js";

const toLiveFrameRef = (
  canvas: CanvasService,
  project: Project,
  direction: Direction,
  frames: readonly CanvasFileFrame[]
): string | null => {
  const mine = frames.filter(
    (frame) => (frame.directionId ?? direction.id) === direction.id
  );

  const presence = canvas.presence(project.id);

  if (presence && presence.directionId === direction.id) {
    const live = mine.find((frame) => frame.id === presence.activeFrameId);

    if (live) {
      return live.id;
    }
  }

  return mine.find((frame) => !frame.hidden)?.id ?? null;
};

const toAccessibilityFrame = async (
  canvas: CanvasService,
  project: Project,
  direction: Direction,
  ref: string | null
): Promise<AccessibilityFrame> => {
  const snapshot = await canvas.read(project);
  const frames = snapshot.canvas?.frames ?? [];

  if (ref !== null) {
    return frameOf(frames, ref);
  }

  return frameOf(frames, toLiveFrameRef(canvas, project, direction, frames));
};

export { toAccessibilityFrame };
