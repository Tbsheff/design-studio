import type { CanvasGuide } from "@design-studio/contracts/canvas-file";
import type { CanvasLayoutGrid } from "@design-studio/contracts/layout-grid";

interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutCard {
  name: string;
  box: LayoutBox;
  rows: string[];
}

interface LayoutRegion {
  main: string;
  mainBox: LayoutBox;
  column: string | null;
  columnBox: LayoutBox | null;
  owners: string[];
  outside: Record<string, number>;
  contentWidth?: number;
  rows?: string[];
  cards?: LayoutCard[];
}

interface PageOwner {
  name: string;
  file: string;
  hasMain: boolean;
}

interface TargetFrame {
  id: string;
  label: string | null;
  path: string;
  width: number;
  height: number;
  layoutGrid?: CanvasLayoutGrid | null;
  guides?: readonly CanvasGuide[] | null;
}

interface RunTarget extends TargetFrame {
  state: string;
  stateName: string | null;
  routeFile: string | null;
  inView: TargetFrame[];
  layout?: LayoutRegion | null;
  owner?: PageOwner | null;
}

export type {
  LayoutBox,
  LayoutCard,
  LayoutRegion,
  PageOwner,
  RunTarget,
  TargetFrame,
};
