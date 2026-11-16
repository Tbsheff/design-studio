import type { AppKey } from "@design-studio/contracts";

import { LAYER_STYLE_KEY_EVENT } from "../../domain/layer-style-key-events.js";
import type { LayerStyleAppKey } from "../../domain/layer-style-key-events.js";
import { STACKING_KEY_EVENT } from "../../domain/stacking-key-events.js";
import type { StackingAppKey } from "../../domain/stacking-key-events.js";
import { requestCanvasTool } from "../../platform/canvas-tool.js";
import type { CanvasToolId } from "../../platform/canvas-tool.js";
import { findElement } from "../../platform/find-element.js";
import { requestScaleMode } from "../../platform/scale-mode.js";

const TOOL_OF_KEY: Partial<Record<AppKey, CanvasToolId>> = {
  "tool-comment": "comment",
  "tool-frame": "frame",
  "tool-hand": "hand",
  "tool-link": "prototype",
  "tool-select": "select",
  "tool-text": "text",
};

const COMMAND_OF_KEY: Partial<Record<AppKey, string>> = {
  "column-assets": "panel.assets",
  "column-components": "panel.components",
  "column-layers": "panel.layers",
  "column-pages": "panel.pages",
  "column-system": "panel.system",
  "column-tokens": "panel.assets",
  "column-versions": "panel.versions",
  inspector: "panel.inspector",
  "view-outline": "view.outline",
};

const STYLE_APP_KEYS: ReadonlySet<AppKey> = new Set<LayerStyleAppKey>([
  "style-copy",
  "style-paste",
]);

const runPreviewStyleKey = (id: AppKey): boolean => {
  if (!STYLE_APP_KEYS.has(id)) {
    return false;
  }

  globalThis.dispatchEvent(
    new CustomEvent(LAYER_STYLE_KEY_EVENT, { detail: { id } })
  );

  return true;
};

const STACKING_APP_KEYS: ReadonlySet<AppKey> = new Set<StackingAppKey>([
  "layer-back",
  "layer-backward",
  "layer-forward",
  "layer-front",
]);

const runPreviewStackingKey = (id: AppKey): boolean => {
  if (!STACKING_APP_KEYS.has(id)) {
    return false;
  }

  globalThis.dispatchEvent(
    new CustomEvent(STACKING_KEY_EVENT, { detail: { id } })
  );

  return true;
};

const isPlaying = (): boolean =>
  findElement(document.body, ".play-bar") !== null;

const runPreviewScaleKey = (): boolean => {
  if (!isPlaying()) {
    requestScaleMode();
  }

  return true;
};

const runPreviewToolKey = (id: AppKey): boolean => {
  if (id === "tool-scale") {
    return runPreviewScaleKey();
  }

  const tool = TOOL_OF_KEY[id];

  if (!tool) {
    return false;
  }

  if (!isPlaying()) {
    requestCanvasTool(tool);
  }

  return true;
};

const toPreviewCommandId = (id: AppKey): string | null =>
  COMMAND_OF_KEY[id] ?? null;

export {
  runPreviewStackingKey,
  runPreviewStyleKey,
  runPreviewToolKey,
  toPreviewCommandId,
};
