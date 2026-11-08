import { toBars } from "./svg-bars.js";
import {
  FONT_SMALL,
  FONT_TITLE,
  GLYPH_WIDTH,
  LEGEND_GAP,
  LEGEND_HEIGHT,
  LEGEND_SWATCH,
  MARGIN_LEFT,
  MARGIN_TOP,
  SUMMARY_ROWS,
  TITLE_HEIGHT,
  WIDTH,
  toColor,
  toFrame,
  toGrid,
  toText,
  toXLabels,
} from "./svg-frame.js";
import type { ChartSvgOptions, Frame } from "./svg-frame.js";
import { toLines } from "./svg-lines.js";
import { toMarkup, toNode, toTextNode } from "./svg-markup.js";
import type { SvgNode } from "./svg-markup.js";
import { toPieLegend, toPieNodes } from "./svg-pie.js";
import type { ChartSpec } from "./types.js";

const SWATCH_RADIUS = 2;

const LEGEND_TEXT_GAP = 6;

const THIRD = 3;

const KIND_NAMES = {
  area: "Area",
  bar: "Bar",
  line: "Line",
  pie: "Pie",
  sparkline: "Sparkline",
} as const;

const toLabel = (spec: ChartSpec): string => {
  const kind = KIND_NAMES[spec.kind];
  const names = spec.series.map((item) => item.label).join(", ");
  const head = spec.title ?? `${kind} chart`;

  return `${head}. ${kind} chart of ${names}, ${spec.rows.length} points.`;
};

const toSummary = (spec: ChartSpec): string => {
  const rows = spec.rows.slice(0, SUMMARY_ROWS).map((row) => {
    const cells = row.values.map(
      (value, index) => `${spec.series[index]?.label ?? "Value"} ${value}`
    );

    return `${row.label}: ${cells.join(", ")}`;
  });

  return rows.join("; ");
};

const toTitleHeight = (spec: ChartSpec): number => {
  if (spec.title === null || spec.kind === "sparkline") {
    return 0;
  }

  return TITLE_HEIGHT;
};

const toTitleNodes = (spec: ChartSpec): SvgNode[] => {
  if (spec.title === null || spec.kind === "sparkline") {
    return [];
  }

  return [
    toText(spec.title, {
      "font-size": FONT_TITLE,
      "font-weight": 600,
      x: MARGIN_LEFT / 2,
      y: MARGIN_TOP + FONT_TITLE,
    }),
  ];
};

const toLegendNodes = (frame: Frame): SvgNode[] => {
  const { spec } = frame;

  if (!spec.hasLegend || spec.kind === "sparkline" || spec.kind === "pie") {
    return [];
  }

  const base = spec.height - LEGEND_HEIGHT / 2;
  let cursor: number = frame.plot.left;

  return spec.series.flatMap((item, index) => {
    const nodes = [
      toNode(
        "rect",
        {
          fill: toColor(frame.colors, index),
          height: LEGEND_SWATCH,
          rx: SWATCH_RADIUS,
          width: LEGEND_SWATCH,
          x: cursor,
          y: base - LEGEND_SWATCH / 2,
        },
        []
      ),
      toText(item.label, {
        x: cursor + LEGEND_SWATCH + LEGEND_TEXT_GAP,
        y: base + FONT_SMALL / THIRD,
      }),
    ];

    cursor +=
      LEGEND_SWATCH +
      LEGEND_TEXT_GAP +
      item.label.length * GLYPH_WIDTH +
      LEGEND_GAP;

    return nodes;
  });
};

const toBody = (frame: Frame): SvgNode[] => {
  const { spec } = frame;

  if (spec.kind === "sparkline") {
    return toLines(frame);
  }

  if (spec.kind === "bar") {
    return [...toGrid(frame), ...toBars(frame), ...toXLabels(frame)];
  }

  return [...toGrid(frame), ...toLines(frame), ...toXLabels(frame)];
};

const toChartSvg = (spec: ChartSpec, options: ChartSvgOptions): string => {
  const frame = toFrame(spec, options);
  const label = toLabel(spec);
  let body = toBody(frame);
  let legend = toLegendNodes(frame);

  if (spec.kind === "pie") {
    const title = toTitleHeight(spec);

    body = toPieNodes(spec, options.colors, title);
    legend = toPieLegend(spec, options.colors, title);
  }

  const root = toNode(
    "svg",
    {
      "aria-label": label,
      role: "img",
      viewBox: `0 0 ${WIDTH} ${spec.height}`,
      width: "100%",
    },
    [
      toTextNode("title", {}, spec.title ?? label),
      toTextNode("desc", {}, toSummary(spec)),
      ...toTitleNodes(spec),
      ...body,
      ...legend,
    ]
  );

  return toMarkup(root, options.isJsx);
};

export { toChartSvg };
