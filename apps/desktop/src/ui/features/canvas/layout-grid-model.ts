import {
  LAYOUT_GRID_COLUMNS_MAX,
  LAYOUT_GRID_GUTTER_MAX,
  LAYOUT_GRID_MARGIN_MAX,
  LAYOUT_GRID_ROW_STEP_MAX,
  LAYOUT_GRID_ROW_STEP_MIN,
} from "@design-studio/contracts/layout-grid";
import type { CanvasLayoutGrid } from "@design-studio/contracts/layout-grid";
import type { CSSProperties } from "react";

import type { CanvasFrame } from "./canvas-layout-types.js";

const LAYOUT_GRID_EVENT = "studio:layout-grid";

const WIDE_FRAME_MIN = 1024;

const SCREEN_MIN_PX = 2;

const ROW_SCREEN_MIN_PX = 4;

const ROW_STEP_PRESET = 8;

const DESKTOP_GRID: CanvasLayoutGrid = {
  columns: 12,
  gutter: 24,
  margin: 80,
  rowStep: null,
};

const MOBILE_GRID: CanvasLayoutGrid = {
  columns: 4,
  gutter: 16,
  margin: 16,
  rowStep: null,
};

type LayoutGridPresetId = "columns-12" | "columns-4" | "rows-8";

interface LayoutGridDraft {
  readonly columns: string;
  readonly gutter: string;
  readonly margin: string;
  readonly rowStep: string;
}

interface GridColumn {
  readonly left: number;
  readonly style: CSSProperties;
}

interface LayoutGridDetail {
  readonly frameId: string | null;
}

const toDefaultGrid = (frameWidth: number): CanvasLayoutGrid => {
  if (frameWidth >= WIDE_FRAME_MIN) {
    return DESKTOP_GRID;
  }

  return MOBILE_GRID;
};

const toPresetGrid = (
  preset: LayoutGridPresetId,
  current: CanvasLayoutGrid | null,
  frameWidth: number
): CanvasLayoutGrid => {
  if (preset === "columns-12") {
    return { ...DESKTOP_GRID, rowStep: current?.rowStep ?? null };
  }

  if (preset === "columns-4") {
    return { ...MOBILE_GRID, rowStep: current?.rowStep ?? null };
  }

  return {
    ...(current ?? toDefaultGrid(frameWidth)),
    rowStep: ROW_STEP_PRESET,
  };
};

const toColumnWidth = (grid: CanvasLayoutGrid, frameWidth: number): number =>
  (frameWidth - grid.margin * 2 - grid.gutter * (grid.columns - 1)) /
  grid.columns;

const toGridColumns = (
  grid: CanvasLayoutGrid,
  frameWidth: number
): readonly GridColumn[] => {
  const width = toColumnWidth(grid, frameWidth);

  if (width <= 0) {
    return [];
  }

  return Array.from({ length: grid.columns }, (_unused, index) => {
    const left = grid.margin + index * (width + grid.gutter);

    return { left, style: { left, width } };
  });
};

const isGridVisible = (
  grid: CanvasLayoutGrid,
  frameWidth: number,
  zoom: number
): boolean => {
  if (toColumnWidth(grid, frameWidth) * zoom < SCREEN_MIN_PX) {
    return false;
  }

  return grid.gutter === 0 || grid.gutter * zoom >= SCREEN_MIN_PX;
};

const isRowsVisible = (grid: CanvasLayoutGrid, zoom: number): boolean =>
  grid.rowStep !== null && grid.rowStep * zoom >= ROW_SCREEN_MIN_PX;

const toDraft = (grid: CanvasLayoutGrid): LayoutGridDraft => ({
  columns: String(grid.columns),
  gutter: String(grid.gutter),
  margin: String(grid.margin),
  rowStep: String(grid.rowStep ?? ""),
});

const toClamped = (
  text: string,
  min: number,
  max: number,
  fallback: number
): number => {
  const value = Math.round(Number(text));

  if (text.trim() === "" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
};

const toRowStep = (text: string): number | null => {
  if (text.trim() === "") {
    return null;
  }

  return toClamped(
    text,
    LAYOUT_GRID_ROW_STEP_MIN,
    LAYOUT_GRID_ROW_STEP_MAX,
    ROW_STEP_PRESET
  );
};

const fromDraft = (
  draft: LayoutGridDraft,
  base: CanvasLayoutGrid
): CanvasLayoutGrid => ({
  columns: toClamped(draft.columns, 1, LAYOUT_GRID_COLUMNS_MAX, base.columns),
  gutter: toClamped(draft.gutter, 0, LAYOUT_GRID_GUTTER_MAX, base.gutter),
  margin: toClamped(draft.margin, 0, LAYOUT_GRID_MARGIN_MAX, base.margin),
  rowStep: toRowStep(draft.rowStep),
});

const POPOVER_GAP = 12;

interface GridOrigin {
  readonly x: number;
  readonly y: number;
}

const toFrameBoxStyle = (
  frame: CanvasFrame,
  origin: GridOrigin
): CSSProperties => ({
  height: frame.height,
  left: frame.x - origin.x,
  top: frame.y - origin.y,
  width: frame.width,
});

const toGridStyle = (
  frame: CanvasFrame,
  origin: GridOrigin,
  rowStep: number | null
): CSSProperties => {
  const box = toFrameBoxStyle(frame, origin);

  if (rowStep === null) {
    return box;
  }

  return { ...box, "--grid-row": `${rowStep}px` } as CSSProperties;
};

const toPopoverStyle = (
  frame: CanvasFrame,
  origin: GridOrigin,
  zoom: number
): CSSProperties => ({
  left: frame.x - origin.x + frame.width + POPOVER_GAP / zoom,
  top: frame.y - origin.y,
});

const toGridKey = (frame: CanvasFrame): string =>
  `${frame.id}:${JSON.stringify(frame.layoutGrid ?? null)}`;

const isSameGrid = (
  first: CanvasLayoutGrid | null,
  second: CanvasLayoutGrid | null
): boolean => JSON.stringify(first) === JSON.stringify(second);

export {
  LAYOUT_GRID_EVENT,
  fromDraft,
  isGridVisible,
  isRowsVisible,
  isSameGrid,
  toDefaultGrid,
  toDraft,
  toFrameBoxStyle,
  toGridColumns,
  toGridKey,
  toGridStyle,
  toPopoverStyle,
  toPresetGrid,
};

export type {
  GridColumn,
  GridOrigin,
  LayoutGridDetail,
  LayoutGridDraft,
  LayoutGridPresetId,
};
