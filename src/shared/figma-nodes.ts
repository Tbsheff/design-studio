import type { InsertJsxResult, InsertTarget, JsxInsertPosition } from './insert.js';

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaVector {
  x: number;
  y: number;
}

export interface FigmaColorStop {
  position: number;
  color: FigmaColor;
}

export interface FigmaPaint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  gradientStops?: FigmaColorStop[];
  gradientHandlePositions?: FigmaVector[];
  scaleMode?: string;
  imageRef?: string;
}

export interface FigmaEffect {
  type: string;
  visible?: boolean;
  color?: FigmaColor;
  offset?: FigmaVector;
  radius?: number;
  spread?: number;
}

export interface FigmaTypeStyle {
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  italic?: boolean;
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercentFontSize?: number;
  lineHeightUnit?: string;
  textAlignHorizontal?: string;
  textCase?: string;
  textDecoration?: string;
}

export interface FigmaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaComponentProperty {
  type: string;
  value: string | boolean;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: FigmaRect | null;
  layoutMode?: string;
  layoutWrap?: string;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
  layoutAlign?: string;
  layoutGrow?: number;
  layoutPositioning?: string;
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  individualStrokeWeights?: { top: number; right: number; bottom: number; left: number };
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  effects?: FigmaEffect[];
  opacity?: number;
  clipsContent?: boolean;
  characters?: string;
  style?: FigmaTypeStyle;
  textAutoResize?: string;
  componentId?: string;
  componentProperties?: Record<string, FigmaComponentProperty>;
}

export interface FigmaComponentMeta {
  name: string;
  componentSetId?: string;
}

export interface FigmaFrameInfo {
  id: string;
  name: string;
  type: string;
  width: number | null;
  height: number | null;
}

export type FigmaImportSource = { nodes: string } | { link: string };

export type FigmaImportRequest = FigmaImportSource & {
  nodeId?: string;
  target: InsertTarget;
  position: JsxInsertPosition;
  dryRun?: boolean;
};

export interface FigmaKitUse {
  layer: string;
  component: string;
  file: string;
}

export interface FigmaImportStats {
  layers: number;
  hidden: number;
  tokens: number;
  rawColors: string[];
  kit: FigmaKitUse[];
  images: number;
  notes: string[];
}

export interface FigmaImportPreview {
  fileName: string | null;
  frames: FigmaFrameInfo[];
  frame: FigmaFrameInfo;
  markup: string;
  stats: FigmaImportStats;
}

export interface FigmaImportResult extends InsertJsxResult {
  frame: FigmaFrameInfo;
  stats: FigmaImportStats;
}

export const FIGMA_NODES_MAX_BYTES = 10 * 1024 * 1024;
export const FIGMA_LAYERS_MAX = 600;

export function looksLikeFigmaNodes(text: string): boolean {
  const head = text.trimStart();
  if (!head.startsWith('{')) return false;
  return /"(nodes|document)"\s*:/.test(head.slice(0, 4000)) || (/"type"\s*:\s*"(FRAME|COMPONENT|INSTANCE|GROUP|SECTION)"/.test(head.slice(0, 4000)) && /"absoluteBoundingBox"/.test(head));
}

export function looksLikeFigmaLink(text: string): boolean {
  return /^https:\/\/(www\.)?figma\.com\/(file|design|proto)\/[A-Za-z0-9]+/.test(text.trim());
}
