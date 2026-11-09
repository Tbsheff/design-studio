import type { AppKey } from "@design-studio/contracts";

import { requestCanvasTool } from "../../platform/canvas-tool.js";
import type { CanvasToolId } from "../../platform/canvas-tool.js";
import { findElement } from "../../platform/find-element.js";

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
  "column-tokens": "panel.tokens",
  "column-versions": "panel.versions",
  inspector: "panel.inspector",
};

const isPlaying = (): boolean =>
  findElement(document.body, ".play-bar") !== null;

const runPreviewToolKey = (id: AppKey): boolean => {
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

export { runPreviewToolKey, toPreviewCommandId };
