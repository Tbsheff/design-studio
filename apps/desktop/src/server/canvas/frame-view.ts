import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import type { CanvasLayoutGrid } from "@design-studio/contracts/layout-grid";

interface FrameView {
  readonly direction: string;
  readonly height: number;
  readonly hidden?: true;
  readonly id: string;
  readonly label: string | null;
  readonly layoutGrid?: CanvasLayoutGrid;
  readonly page: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

const toFrameView = (frame: CanvasFileFrame, ownerId: string): FrameView => {
  const view: FrameView = {
    direction:
      frame.directionId ?? `${ownerId} (follows the current direction)`,
    height: frame.height,
    id: frame.id,
    label: frame.label ?? null,
    page: frame.path ?? "(entry page)",
    width: frame.width,
    x: frame.x,
    y: frame.y,
  };

  if (frame.hidden && frame.layoutGrid) {
    return { ...view, hidden: true, layoutGrid: frame.layoutGrid };
  }

  if (frame.hidden) {
    return { ...view, hidden: true };
  }

  if (frame.layoutGrid) {
    return { ...view, layoutGrid: frame.layoutGrid };
  }

  return view;
};

export { toFrameView };

export type { FrameView };
