import type { ViewportPreset, ZoomKey } from "./deps.js";

interface CanvasActions {
  checking: boolean;
  comment: { available: boolean; on: boolean; toggle: () => void };
  dark: { on: boolean; toggle: () => void } | null;
  draw: { on: boolean; toggle: () => void } | null;
  hasHead: boolean;
  layersOpen: boolean;
  live: boolean;
  lofi: { on: boolean; toggle: () => void } | null;
  onCheck: () => void;
  onLayers: () => void;
  onSelect: () => void;
  onSource: (kind: "live" | "last") => void;
  play: () => void;
  presets: readonly ViewportPreset[];
  selectMode: boolean;
  zoom: (key: ZoomKey) => void;
}

export type { CanvasActions };
