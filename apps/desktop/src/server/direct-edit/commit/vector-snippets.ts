import {
  DEFAULT_FIGURE_FILL,
  DEFAULT_PEN_STROKE,
} from "../../../shared/vector.js";
import type {
  VectorBox,
  VectorPaint,
  VectorRequest,
} from "../../../shared/vector.js";
import { DirectEditError } from "../engine/errors.js";
import {
  boxOfPoints,
  pathRings,
  round,
  translatePath,
} from "../engine/vector-geometry.js";
import {
  attrText,
  elementText,
  toPairedElement,
  svgText,
} from "../engine/vector-snippet.js";
import type { Attrs } from "../engine/vector-snippet.js";

type PlacedRequest = Extract<VectorRequest, { op: "shape" | "path" | "text" }>;

type FigureKind = "rect" | "ellipse";

interface PlacedSnippet {
  readonly jsx: string;
  readonly verb: string;
}

interface PaintAttrs {
  readonly fill: string;
  readonly stroke?: string;
  readonly "stroke-width"?: number;
}

const MIN_SIZE = 1;

const TEXT_DEFAULT = "Text";

const PATH_DATA_KEY = "d";

const MOVE_POINT = /[Mm]\s*(?<left>[-+]?[\d.]+)[\s,]*(?<top>[-+]?[\d.]+)/u;

const toFillColor = (request: VectorPaint, fill: string): string => {
  if (request.fill === null) {
    return "none";
  }

  return request.fill ?? fill;
};

const toStrokeColor = (
  request: VectorPaint,
  stroke: string | null
): string | null => {
  if (request.stroke === null) {
    return null;
  }

  return request.stroke ?? stroke;
};

const toStrokeWidth = (
  request: VectorPaint,
  width: number | null
): number | null => {
  if (request.strokeWidth === null) {
    return null;
  }

  return request.strokeWidth ?? width;
};

const toPaintAttrs = (
  request: VectorPaint,
  fill: string,
  stroke: string | null,
  width: number | null
): PaintAttrs => {
  const fillColor = toFillColor(request, fill);
  const strokeColor = toStrokeColor(request, stroke);

  if (strokeColor === null) {
    return { fill: fillColor };
  }

  const strokeWidth = toStrokeWidth(request, width);

  if (strokeWidth === null) {
    return { fill: fillColor, stroke: strokeColor };
  }

  return { fill: fillColor, stroke: strokeColor, "stroke-width": strokeWidth };
};

const toPaintWidth = (width: number): string => String(round(width));

const toFigureChild = (
  figure: FigureKind,
  size: { readonly width: number; readonly height: number },
  colors: PaintAttrs,
  html: boolean
): string => {
  const { width, height } = size;

  if (figure === "rect") {
    return elementText("rect", { height, width, ...colors }, html);
  }

  return elementText(
    "ellipse",
    {
      cx: round(width / 2),
      cy: round(height / 2),
      rx: round(width / 2),
      ry: round(height / 2),
      ...colors,
    },
    html
  );
};

const toFigureName = (figure: FigureKind): string => {
  if (figure === "rect") {
    return "Rectangle";
  }

  return "Ellipse";
};

const toFigureSnippet = (
  request: Extract<VectorRequest, { op: "shape" }>,
  html: boolean
): string => {
  const width = Math.max(MIN_SIZE, round(request.box.width));
  const height = Math.max(MIN_SIZE, round(request.box.height));
  const colors = toPaintAttrs(request, DEFAULT_FIGURE_FILL, null, 1);
  const child = toFigureChild(request.shape, { height, width }, colors, html);

  return svgText(
    request.name ?? toFigureName(request.shape),
    { height, width, x: request.box.x, y: request.box.y },
    child,
    html
  );
};

const toMovePoints = (pathData: string): [number, number][] => {
  const match = MOVE_POINT.exec(pathData);

  if (!match?.groups) {
    return [];
  }

  return [[Number(match.groups.left), Number(match.groups.top)]];
};

const toPathPad = (colors: PaintAttrs): number => {
  if (!colors.stroke) {
    return 0;
  }

  return Math.ceil((colors["stroke-width"] ?? 1) / 2);
};

const toPathAttrs = (pathData: string, colors: PaintAttrs): Attrs => {
  const attrs: Attrs = { [PATH_DATA_KEY]: pathData, ...colors };

  if (!colors.stroke) {
    return attrs;
  }

  return { ...attrs, "stroke-linecap": "round", "stroke-linejoin": "round" };
};

const toPathSnippet = (
  request: Extract<VectorRequest, { op: "path" }>,
  html: boolean
): string => {
  const points = request[PATH_DATA_KEY];

  const bounds =
    boxOfPoints(pathRings(points).flat()) ?? boxOfPoints(toMovePoints(points));

  if (!bounds) {
    throw new DirectEditError("invalid_request", "The path has no points");
  }

  const colors = toPaintAttrs(request, "none", DEFAULT_PEN_STROKE, 2);
  const pad = toPathPad(colors);

  const frame: VectorBox = {
    height: Math.max(MIN_SIZE, bounds.height + pad * 2),
    width: Math.max(MIN_SIZE, bounds.width + pad * 2),
    x: bounds.x - pad,
    y: bounds.y - pad,
  };

  const moved = translatePath(points, -frame.x, -frame.y);
  const child = elementText("path", toPathAttrs(moved, colors), html);

  return svgText(request.name ?? "Vector", frame, child, html);
};

const toTextEscaped = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll("{", "&#123;");

const toTextStyle = (box: VectorBox, html: boolean): string => {
  const left = round(box.x);
  const top = round(box.y);

  if (html) {
    return ` style="position: absolute; left: ${left}px; top: ${top}px; margin: 0"`;
  }

  return ` style={{ position: 'absolute', left: ${left}, top: ${top}, margin: 0 }}`;
};

const toTextSnippet = (
  request: Extract<VectorRequest, { op: "text" }>,
  html: boolean
): string => {
  const attrs = attrText({ "data-name": request.name ?? TEXT_DEFAULT }, html);
  const body = toTextEscaped(request.text ?? TEXT_DEFAULT);

  return toPairedElement(
    "p",
    `${attrs}${toTextStyle(request.box, html)}`,
    body
  );
};

const toFigureVerb = (figure: FigureKind): string => {
  if (figure === "rect") {
    return "Draw rectangle";
  }

  return "Draw ellipse";
};

const toPlacedSnippet = (
  request: PlacedRequest,
  html: boolean
): PlacedSnippet => {
  if (request.op === "shape") {
    return {
      jsx: toFigureSnippet(request, html),
      verb: toFigureVerb(request.shape),
    };
  }

  if (request.op === "text") {
    return { jsx: toTextSnippet(request, html), verb: "Add text" };
  }

  return { jsx: toPathSnippet(request, html), verb: "Draw vector path" };
};

export { toPaintWidth, toPlacedSnippet };

export type { PlacedRequest };
