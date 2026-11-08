import type { InsertKind } from "@design-studio/contracts";

import { collectCommands } from "../../inspector-slots.js";

interface InsertItem {
  readonly kind: InsertKind;
  readonly label: string;
  readonly glyph: string;
}

interface VectorView {
  readonly id: string;
  readonly label: string;
  readonly keyLabel: string;
  readonly glyph: string;
}

type ToolAlign = "start" | "end";

const GLYPHS = {
  directSelect: "M4 2.5l7.5 4-3.25 1L6.5 11zM9.75 9.75l3 3",
  frame: "M5 2v12M11 2v12M2 5h12M2 11h12",
  redo: "M10.5 4l3 3-3 3M13.25 7H6a3.25 3.25 0 0 0 0 6.5h2.5",
  text: "M3.5 3.5h9M8 3.5v9M6.25 12.5h3.5",
};

const INSERTS: readonly InsertItem[] = [
  { glyph: GLYPHS.text, kind: "text", label: "Text" },
  { glyph: GLYPHS.frame, kind: "frame", label: "Frame" },
];

const ICON_SIZE = 14;

const HTML_FILE = /\.html?$/iu;

const isHtmlFile = (file: string | null): boolean =>
  file !== null && HTML_FILE.test(file);

const isCanvasSelectMode = (): boolean =>
  collectCommands().find((command) => command.id === "tool.select")?.title ===
  "Stop selecting";

const toInsertTip = (
  hasSelection: boolean,
  isHtmlSelection: boolean
): string | null => {
  if (!hasSelection) {
    return "Select a parent element first";
  }

  if (isHtmlSelection) {
    return null;
  }

  return "Adding elements works on one element in an HTML file";
};

const toInsertItemTip = (
  item: InsertItem,
  insertTip: string | null
): string => {
  if (insertTip) {
    return `${item.label}: ${insertTip}`;
  }

  return `Add ${item.label.toLowerCase()} inside the selection`;
};

const toChildTip = (hasSelection: boolean): string => {
  if (hasSelection) {
    return "Select child";
  }

  return "Select an element first";
};

const toVariantsTip = (blocked: string | null): string => {
  if (blocked) {
    return `Try variants: ${blocked}`;
  }

  return "Try variants of this element";
};

const toVectorTip = (
  label: string,
  keyLabel: string,
  isAvailable: boolean
): string => {
  if (isAvailable) {
    return `${label} ${keyLabel}: draw on the canvas`;
  }

  return `${label}: open the live preview to draw`;
};

export {
  GLYPHS,
  ICON_SIZE,
  INSERTS,
  isCanvasSelectMode,
  isHtmlFile,
  toChildTip,
  toInsertItemTip,
  toInsertTip,
  toVariantsTip,
  toVectorTip,
};

export type { InsertItem, ToolAlign, VectorView };
