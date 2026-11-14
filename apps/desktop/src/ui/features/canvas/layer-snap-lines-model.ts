import type { CanvasGuide } from "@design-studio/contracts/canvas-file";

import type { CanvasFrame } from "./canvas-layout-types.js";
import {
  isGridVisible,
  isRowsVisible,
  toGridColumns,
} from "./layout-grid-model.js";
import { snapToGuides, toGuideMarks } from "./ruler-guide-model.js";
import { snapRect } from "./snap-model.js";
import type { Rect, SnapKind, SnapResult } from "./snap-model.js";

const ROW_LINES_MAX = 2000;

interface LayerLinesInput {
  readonly frame: CanvasFrame | null;
  readonly guides: readonly CanvasGuide[];
  readonly isGridShown: boolean;
  readonly zoom: number;
}

interface LayerSnapInput {
  readonly rect: Rect;
  readonly candidates: readonly Rect[];
  readonly lines: readonly CanvasGuide[];
  readonly x: SnapKind;
  readonly y: SnapKind;
  readonly zoom: number;
}

const NO_LAYER_LINES: readonly CanvasGuide[] = [];

const toColumnLines = (frame: CanvasFrame, zoom: number): CanvasGuide[] => {
  const grid = frame.layoutGrid ?? null;

  if (grid === null || !isGridVisible(grid, frame.width, zoom)) {
    return [];
  }

  return toGridColumns(grid, frame.width).flatMap((column) => {
    const width = Number(column.style.width ?? 0);

    return [
      { at: column.left, axis: "x" as const },
      { at: column.left + width, axis: "x" as const },
    ];
  });
};

const toRowLines = (frame: CanvasFrame, zoom: number): CanvasGuide[] => {
  const grid = frame.layoutGrid ?? null;

  if (grid === null || grid.rowStep === null || !isRowsVisible(grid, zoom)) {
    return [];
  }

  const step = grid.rowStep;
  const count = Math.min(ROW_LINES_MAX, Math.floor(frame.height / step));

  return Array.from({ length: count + 1 }, (_unused, index) => ({
    at: index * step,
    axis: "y" as const,
  }));
};

const toGridLines = (input: LayerLinesInput): CanvasGuide[] => {
  const { frame } = input;

  if (!input.isGridShown || frame === null) {
    return [];
  }

  return [
    ...toColumnLines(frame, input.zoom),
    ...toRowLines(frame, input.zoom),
  ];
};

const toFrameOffset = (
  frame: CanvasFrame,
  axis: CanvasGuide["axis"]
): number => {
  if (axis === "x") {
    return frame.x;
  }

  return frame.y;
};

const toFrameSide = (frame: CanvasFrame, axis: CanvasGuide["axis"]): number => {
  if (axis === "x") {
    return frame.width;
  }

  return frame.height;
};

const toGuideLines = (input: LayerLinesInput): CanvasGuide[] => {
  const { frame } = input;

  if (frame === null) {
    return [];
  }

  return input.guides.flatMap((guide) => {
    const at = guide.at - toFrameOffset(frame, guide.axis);

    if (at < 0 || at > toFrameSide(frame, guide.axis)) {
      return [];
    }

    return [{ at, axis: guide.axis }];
  });
};

const toLayerSnapLines = (input: LayerLinesInput): readonly CanvasGuide[] => {
  if (input.frame === null || input.frame.hidden === true) {
    return NO_LAYER_LINES;
  }

  return [...toGridLines(input), ...toGuideLines(input)];
};

const snapLayerRect = (input: LayerSnapInput): SnapResult => {
  const kinds = { x: input.x, y: input.y };

  const lined = snapToGuides({
    lines: input.lines,
    rect: input.rect,
    zoom: input.zoom,
    ...kinds,
  });

  const snapped = snapRect({
    candidates: [...input.candidates],
    rect: lined.rect,
    x: lined.x,
    y: lined.y,
    zoom: input.zoom,
  });

  return {
    ...snapped,
    guides: [
      ...snapped.guides,
      ...toGuideMarks(snapped.rect, input.lines, kinds),
    ],
  };
};

export { NO_LAYER_LINES, snapLayerRect, toLayerSnapLines };

export type { LayerLinesInput, LayerSnapInput };
