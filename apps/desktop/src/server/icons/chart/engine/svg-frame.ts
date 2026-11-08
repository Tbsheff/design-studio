import { toNode, toRounded, toTextNode } from "./svg-markup.js";
import type { AttrValue, SvgNode } from "./svg-markup.js";
import { toTickLabel, toValueScale } from "./svg-scale.js";
import type { ValueScale } from "./svg-scale.js";
import type { ChartSpec } from "./types.js";

interface ChartSvgOptions {
  readonly colors: readonly string[];
  readonly isJsx: boolean;
}

interface Plot {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

interface Frame {
  readonly colors: readonly string[];
  readonly count: number;
  readonly plot: Plot;
  readonly scale: ValueScale;
  readonly spec: ChartSpec;
}

const WIDTH = 640;

const MARGIN_LEFT = 44;

const MARGIN_RIGHT = 16;

const MARGIN_TOP = 12;

const TITLE_HEIGHT = 28;

const LEGEND_HEIGHT = 28;

const AXIS_HEIGHT = 26;

const SPARK_MARGIN = 4;

const LABELS_MAX = 10;

const FONT_SMALL = 11;

const FONT_TITLE = 14;

const FULL_TURN = Math.PI * 2;

const PIE_HOLE = 0.58;

const LEGEND_SWATCH = 10;

const LEGEND_GAP = 16;

const GLYPH_WIDTH = 6.5;

const MUTED = 0.62;

const GRID = 0.14;

const AREA_FILL = 0.25;

const SUMMARY_ROWS = 12;

const TICK_OFFSET = 8;

const TICK_BASELINE = 4;

const LABEL_OFFSET = 18;

const BAND_CENTER = 0.5;

const toColor = (colors: readonly string[], index: number): string =>
  colors[index % Math.max(colors.length, 1)] ?? "currentColor";

const toText = (
  text: string,
  attrs: Readonly<Record<string, AttrValue>>
): SvgNode =>
  toTextNode(
    "text",
    { fill: "currentColor", "font-size": FONT_SMALL, ...attrs },
    text
  );

const toPlot = (spec: ChartSpec): Plot => {
  if (spec.kind === "sparkline") {
    return {
      bottom: spec.height - SPARK_MARGIN,
      left: SPARK_MARGIN,
      right: WIDTH - SPARK_MARGIN,
      top: SPARK_MARGIN,
    };
  }

  let upper = MARGIN_TOP;
  let lower = spec.height - AXIS_HEIGHT;

  if (spec.title !== null) {
    upper += TITLE_HEIGHT;
  }

  if (spec.hasLegend) {
    lower -= LEGEND_HEIGHT;
  }

  return {
    bottom: lower,
    left: MARGIN_LEFT,
    right: WIDTH - MARGIN_RIGHT,
    top: upper,
  };
};

const toTotals = (spec: ChartSpec): number[] =>
  spec.rows.map((row) => {
    if (spec.isStacked) {
      return row.values.reduce((sum, value) => sum + Math.max(value, 0), 0);
    }

    return Math.max(...row.values, 0);
  });

const toLow = (spec: ChartSpec): number =>
  Math.min(0, ...spec.rows.flatMap((row) => row.values));

const toFrame = (source: ChartSpec, options: ChartSvgOptions): Frame => ({
  colors: options.colors,
  count: source.rows.length,
  plot: toPlot(source),
  scale: toValueScale(toLow(source), Math.max(...toTotals(source), 1)),
  spec: source,
});

const toY = (frame: Frame, value: number): number => {
  const { plot, scale } = frame;
  const share = (value - scale.min) / (scale.max - scale.min);

  return toRounded(plot.bottom - share * (plot.bottom - plot.top));
};

const toBand = (frame: Frame): number =>
  (frame.plot.right - frame.plot.left) / frame.count;

const toBandX = (frame: Frame, index: number): number =>
  toRounded(frame.plot.left + (index + BAND_CENTER) * toBand(frame));

const toPointX = (frame: Frame, index: number): number => {
  if (frame.spec.kind === "bar" || frame.count === 1) {
    return toBandX(frame, index);
  }

  const span = frame.plot.right - frame.plot.left;

  return toRounded(frame.plot.left + (span * index) / (frame.count - 1));
};

const toGrid = (frame: Frame): SvgNode[] =>
  frame.scale.ticks.flatMap((tick) => {
    const level = toY(frame, tick);

    return [
      toNode(
        "line",
        {
          stroke: "currentColor",
          "stroke-opacity": GRID,
          x1: frame.plot.left,
          x2: frame.plot.right,
          y1: level,
          y2: level,
        },
        []
      ),
      toText(toTickLabel(tick), {
        "fill-opacity": MUTED,
        "text-anchor": "end",
        x: frame.plot.left - TICK_OFFSET,
        y: level + TICK_BASELINE,
      }),
    ];
  });

const toXLabels = (frame: Frame): SvgNode[] => {
  const every = Math.ceil(frame.count / LABELS_MAX);

  return frame.spec.rows.flatMap((row, index) => {
    if (index % every !== 0) {
      return [];
    }

    return [
      toText(row.label, {
        "fill-opacity": MUTED,
        "text-anchor": "middle",
        x: toPointX(frame, index),
        y: frame.plot.bottom + LABEL_OFFSET,
      }),
    ];
  });
};

export {
  AREA_FILL,
  FONT_SMALL,
  FONT_TITLE,
  FULL_TURN,
  GLYPH_WIDTH,
  LEGEND_GAP,
  LEGEND_HEIGHT,
  LEGEND_SWATCH,
  MARGIN_LEFT,
  MARGIN_TOP,
  MUTED,
  PIE_HOLE,
  SUMMARY_ROWS,
  TITLE_HEIGHT,
  WIDTH,
  toBand,
  toBandX,
  toColor,
  toFrame,
  toGrid,
  toPointX,
  toText,
  toXLabels,
  toY,
};

export type { ChartSvgOptions, Frame };
