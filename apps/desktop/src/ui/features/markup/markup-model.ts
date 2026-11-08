const MARKUP_TOOLS = ["pen", "arrow", "box", "note"] as const;

type MarkupTool = (typeof MARKUP_TOOLS)[number];

interface MarkupPoint {
  readonly x: number;
  readonly y: number;
}

interface PenStroke {
  readonly id: number;
  readonly kind: "pen";
  readonly points: readonly MarkupPoint[];
}

interface ArrowStroke {
  readonly id: number;
  readonly from: MarkupPoint;
  readonly kind: "arrow";
  readonly to: MarkupPoint;
}

interface BoxStroke {
  readonly id: number;
  readonly from: MarkupPoint;
  readonly kind: "box";
  readonly to: MarkupPoint;
}

type SpanStroke = ArrowStroke | BoxStroke;

interface NoteStroke {
  readonly id: number;
  readonly at: MarkupPoint;
  readonly kind: "note";
  readonly text: string;
}

type MarkupStroke = NoteStroke | PenStroke | SpanStroke;

interface MarkupBoxValue {
  readonly height: number;
  readonly label: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

const MARKUP_COLOR = "#ff3b30";

const STROKE_WIDTH = 4;

const NOTE_FONT = 20;

const HEAD_LENGTH = 22;

const HEAD_SPREAD = 0.45;

const TARGET_SIDE = 32;

const HALF = 2;

const MIN_SPAN = 6;

const LABEL_MAX = 80;

const toHeadPoints = (from: MarkupPoint, to: MarkupPoint): string => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const left = angle + Math.PI - HEAD_SPREAD;
  const right = angle + Math.PI + HEAD_SPREAD;

  return [
    `${to.x + Math.cos(left) * HEAD_LENGTH},${to.y + Math.sin(left) * HEAD_LENGTH}`,
    `${to.x},${to.y}`,
    `${to.x + Math.cos(right) * HEAD_LENGTH},${to.y + Math.sin(right) * HEAD_LENGTH}`,
  ].join(" ");
};

const toPenPoints = (points: readonly MarkupPoint[]): string =>
  points.map((point) => `${point.x},${point.y}`).join(" ");

const toTargetBox = (center: MarkupPoint, title: string): MarkupBoxValue => ({
  height: TARGET_SIDE,
  label: title,
  width: TARGET_SIDE,
  x: Math.round(center.x - TARGET_SIDE / HALF),
  y: Math.round(center.y - TARGET_SIDE / HALF),
});

const toSpanBox = (
  from: MarkupPoint,
  to: MarkupPoint,
  title: string
): MarkupBoxValue => ({
  height: Math.round(Math.abs(to.y - from.y)),
  label: title,
  width: Math.round(Math.abs(to.x - from.x)),
  x: Math.round(Math.min(from.x, to.x)),
  y: Math.round(Math.min(from.y, to.y)),
});

const toPenBox = (points: readonly MarkupPoint[]): MarkupBoxValue => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);

  return {
    height: Math.round(Math.max(...ys) - top),
    label: "",
    width: Math.round(Math.max(...xs) - left),
    x: Math.round(left),
    y: Math.round(top),
  };
};

const toStrokeBox = (stroke: MarkupStroke): MarkupBoxValue => {
  if (stroke.kind === "note") {
    return toTargetBox(stroke.at, stroke.text.slice(0, LABEL_MAX));
  }

  if (stroke.kind === "arrow") {
    return toTargetBox(stroke.to, "");
  }

  if (stroke.kind === "box") {
    return toSpanBox(stroke.from, stroke.to, "");
  }

  return toPenBox(stroke.points);
};

const toMarkupBoxes = (strokes: readonly MarkupStroke[]): MarkupBoxValue[] =>
  strokes.map((stroke) => toStrokeBox(stroke));

const isMeaningful = (stroke: MarkupStroke): boolean => {
  if (stroke.kind === "pen") {
    return stroke.points.length > 1;
  }

  if (stroke.kind === "note") {
    return stroke.text.trim() !== "";
  }

  return (
    Math.hypot(stroke.to.x - stroke.from.x, stroke.to.y - stroke.from.y) >=
    MIN_SPAN
  );
};

export {
  HEAD_LENGTH,
  HEAD_SPREAD,
  MARKUP_COLOR,
  MARKUP_TOOLS,
  NOTE_FONT,
  STROKE_WIDTH,
  isMeaningful,
  toHeadPoints,
  toMarkupBoxes,
  toPenPoints,
};

export type {
  MarkupBoxValue,
  MarkupPoint,
  MarkupStroke,
  MarkupTool,
  NoteStroke,
  PenStroke,
  SpanStroke,
};
