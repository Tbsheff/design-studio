import { findFrame } from "./deps.js";
import type { CanvasFileFrame } from "./deps.js";
import { AccessibilityError } from "./errors.js";

interface AccessibilityFrame {
  readonly directionId: string | null;
  readonly id: string;
  readonly page: string | null;
  readonly viewport: { readonly height: number; readonly width: number };
}

const DEFAULT_VIEWPORT = { height: 900, width: 1440 };

const DEFAULT_FRAME = "f1";

const toFrameOf = (
  frames: readonly CanvasFileFrame[],
  ref: string | null
): AccessibilityFrame => {
  const key = ref ?? DEFAULT_FRAME;
  const found = findFrame(frames, key);

  if (found === null) {
    if (frames.length === 0 && key === DEFAULT_FRAME) {
      return {
        directionId: null,
        id: DEFAULT_FRAME,
        page: null,
        viewport: DEFAULT_VIEWPORT,
      };
    }

    throw new AccessibilityError(
      `No frame ${key} on the canvas. Use canvas_list for the frame ids.`
    );
  }

  return {
    directionId: found.directionId ?? null,
    id: found.id,
    page: found.path || null,
    viewport: { height: found.height, width: found.width },
  };
};

export { DEFAULT_VIEWPORT, toFrameOf as frameOf };

export type { AccessibilityFrame };
