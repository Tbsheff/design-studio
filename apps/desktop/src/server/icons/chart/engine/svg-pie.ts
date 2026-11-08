import {
  FONT_SMALL,
  FULL_TURN,
  LEGEND_SWATCH,
  MARGIN_LEFT,
  MARGIN_TOP,
  PIE_HOLE,
  toColor,
  toText,
} from "./svg-frame.js";
import { toNode, toRounded } from "./svg-markup.js";
import type { SvgNode } from "./svg-markup.js";
import type { ChartSpec } from "./types.js";

interface Center {
  readonly cx: number;
  readonly cy: number;
}

interface Span {
  readonly from: number;
  readonly to: number;
}

const ATTR_PATH = "d";

const PIE_CENTER_X = 190;

const PIE_MARGIN = 12;

const RADIUS_MIN = 24;

const ROW_HEIGHT = 24;

const LIST_X = 380;

const LIST_END = 620;

const FULL_GUARD = 0.0001;

const START_ANGLE = -Math.PI / 2;

const SLICE_GAP = 1.5;

const SWATCH_RADIUS = 2;

const toPoint = (center: Center, radius: number, angle: number): string =>
  `${toRounded(center.cx + radius * Math.cos(angle))} ${toRounded(center.cy + radius * Math.sin(angle))}`;

const toSlicePath = (center: Center, radius: number, span: Span): string => {
  const inner = toRounded(radius * PIE_HOLE);
  const large = Number(span.to - span.from > Math.PI);

  return [
    `M${toPoint(center, radius, span.from)}`,
    `A${radius} ${radius} 0 ${large} 1 ${toPoint(center, radius, span.to)}`,
    `L${toPoint(center, inner, span.to)}`,
    `A${inner} ${inner} 0 ${large} 0 ${toPoint(center, inner, span.from)}`,
    "Z",
  ].join(" ");
};

const toValues = (spec: ChartSpec): number[] =>
  spec.rows.map((row) => Math.max(row.values[0] ?? 0, 0));

const toPieNodes = (
  spec: ChartSpec,
  colors: readonly string[],
  title: number
): SvgNode[] => {
  const values = toValues(spec);
  const sum = values.reduce((total, value) => total + value, 0);
  const total = Math.max(sum, 1);
  const top = MARGIN_TOP + title;
  const bottom = spec.height - PIE_MARGIN;
  const radius = Math.max((bottom - top) / 2, RADIUS_MIN);
  const center = { cx: PIE_CENTER_X, cy: toRounded(top + (bottom - top) / 2) };
  let cursor = START_ANGLE;

  return values.map((value, index) => {
    const sweep = Math.min((value / total) * FULL_TURN, FULL_TURN - FULL_GUARD);
    const span = { from: cursor, to: cursor + sweep };

    cursor += sweep;

    return toNode(
      "path",
      {
        [ATTR_PATH]: toSlicePath(center, radius, span),
        fill: toColor(colors, index),
        stroke: "var(--background, canvas)",
        "stroke-width": SLICE_GAP,
      },
      []
    );
  });
};

const toPieLegend = (
  spec: ChartSpec,
  colors: readonly string[],
  title: number
): SvgNode[] => {
  const top = MARGIN_TOP + title + FONT_SMALL;

  return spec.rows.flatMap((row, index) => {
    const base = top + index * ROW_HEIGHT;

    return [
      toNode(
        "rect",
        {
          fill: toColor(colors, index),
          height: LEGEND_SWATCH,
          rx: SWATCH_RADIUS,
          width: LEGEND_SWATCH,
          x: LIST_X,
          y: base - LEGEND_SWATCH + 1,
        },
        []
      ),
      toText(row.label, { x: LIST_X + MARGIN_LEFT / 2, y: base }),
      toText(`${row.values[0] ?? 0}`, {
        "text-anchor": "end",
        x: LIST_END,
        y: base,
      }),
    ];
  });
};

export { toPieLegend, toPieNodes };
