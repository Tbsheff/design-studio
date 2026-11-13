import type { CanvasLayoutGrid } from "@design-studio/contracts/layout-grid";

import type { Viewport } from "../../platform/storage.js";

interface CanvasFrame {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  directionId?: string;
  path?: string;
  label?: string;
  hidden?: boolean;
  layoutGrid?: CanvasLayoutGrid;
}

interface CanvasLayout {
  frames: CanvasFrame[];
  activeId: string;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FramePreset {
  preset: Exclude<Viewport["preset"], "custom">;
  label: string;
  width: number;
  height: number;
}

export type { Box, CanvasFrame, CanvasLayout, FramePreset };
