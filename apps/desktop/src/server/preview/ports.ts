import type { CheckViewport } from "../../shared/actions/_core/contracts.js";
import type { PlaceholderMode } from "../../shared/run-levels.js";
import type { ProbeRect, QualityProbeResult } from "./quality-probe.js";

interface PeekOptions {
  layoutOnly?: boolean;
}

interface RenderCheckOptions {
  viewports?: CheckViewport[];
  quality?: boolean;
  placeholder?: PlaceholderMode;
  selectionLocs?: string[];
  url?: string;
  filePrefix?: string;
  prepare?: string;
  fresh?: boolean;
  appOnly?: boolean;
}

interface InspectResult {
  path: string;
  selectionRects: ProbeRect[];
  nav: QualityProbeResult["nav"];
}

interface TileRequest {
  viewport: { width: number; height: number };
  tileHeight: number;
  from: number;
  maxTiles: number;
  outPrefix: string;
  theme?: "light" | "dark";
  still?: boolean;
  prepare?: string;
  format?: "png" | "jpeg";
  fresh?: boolean;
  oneOff?: boolean;
}

interface TileResult {
  paths: string[];
  pageHeight: number;
  from: number;
  to: number;
  cached?: boolean;
}

export type { RenderBackend, RenderPage } from "./render-backend.js";

export type {
  InspectResult,
  PeekOptions,
  RenderCheckOptions,
  TileRequest,
  TileResult,
};
