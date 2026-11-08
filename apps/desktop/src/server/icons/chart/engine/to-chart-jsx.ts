import {
  toElement,
  toExpr,
  toFlag,
  toLines,
  toRawChild,
  toText,
} from "./jsx-markup.js";
import type { JsxNode } from "./jsx-markup.js";
import type { ChartRow, ChartSeries, ChartSpec } from "./types.js";

interface ChartJsxOptions {
  readonly colors: readonly string[];
  readonly configName: string;
  readonly dataName: string;
  readonly isKit: boolean;
}

interface ChartJsx {
  readonly configCode: string | null;
  readonly dataCode: string;
  readonly jsx: string;
  readonly kitNames: readonly string[];
  readonly rechartsNames: readonly string[];
}

interface Series {
  readonly color: string;
  readonly key: string;
  readonly label: string;
}

const CHART_TAGS = {
  area: "AreaChart",
  bar: "BarChart",
  line: "LineChart",
  sparkline: "AreaChart",
} as const;

const INDENT = "  ";

const PIE_INNER = 56;

const BAR_RADIUS = 4;

const AXIS_WIDTH = 36;

const TICK_MARGIN = 8;

const TITLE_FONT = 14;

const TITLE_WEIGHT = 500;

const TITLE_GAP = 8;

const FILL_OPACITY = 0.3;

const STACK_ID = "a";

const SPARK_MARGIN = "{ bottom: 2, left: 2, right: 2, top: 2 }";

const KIT_PREFIX = "Chart";

const NAME_PATTERN = /<[A-Z]\w*/gu;

const WORD_PATTERN = /[a-z0-9]+/gu;

const LEADING_LETTER = /^[a-z]/u;

const toQuoted = (text: string): string => JSON.stringify(text);

const toCapitalized = (word: string): string =>
  `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;

const toKey = (label: string): string => {
  const words = label.toLowerCase().match(WORD_PATTERN) ?? ["item"];

  const joined = words
    .map((word, index) => {
      if (index === 0) {
        return word;
      }

      return toCapitalized(word);
    })
    .join("");

  if (LEADING_LETTER.test(joined)) {
    return joined;
  }

  return `item${joined}`;
};

const toColor = (colors: readonly string[], index: number): string =>
  colors[index % Math.max(colors.length, 1)] ?? "currentColor";

const toSeries = (
  spec: ChartSpec,
  options: ChartJsxOptions
): readonly Series[] =>
  spec.series.map((item: ChartSeries, index) => ({
    color: toColor(options.colors, index),
    key: item.key,
    label: item.label,
  }));

const toPieSeries = (
  spec: ChartSpec,
  options: ChartJsxOptions
): readonly Series[] =>
  spec.rows.map((row: ChartRow, index) => ({
    color: toColor(options.colors, index),
    key: toKey(row.label),
    label: row.label,
  }));

const toUnique = (items: readonly Series[]): readonly Series[] => {
  const seen = new Map<string, number>();

  return items.map((item) => {
    const count = seen.get(item.key) ?? 0;

    seen.set(item.key, count + 1);

    if (count === 0) {
      return item;
    }

    return { ...item, key: `${item.key}${count + 1}` };
  });
};

const toFill = (item: Series, options: ChartJsxOptions): string => {
  if (options.isKit) {
    return `var(--color-${item.key})`;
  }

  return item.color;
};

const toPieDatum = (
  spec: ChartSpec,
  options: ChartJsxOptions,
  entry: Series,
  row: ChartRow
): string => {
  const first = spec.series.at(0)?.key ?? "value";
  const value = row.values.at(0) ?? 0;
  const fill = toQuoted(toFill(entry, options));

  return `${INDENT}{ ${first}: ${value}, fill: ${fill}, label: ${toQuoted(entry.key)} },`;
};

const toDataCode = (
  spec: ChartSpec,
  options: ChartJsxOptions,
  pie: readonly Series[]
): string => {
  const rows = spec.rows.map((row, rowIndex) => {
    const entry = pie.at(rowIndex);

    if (spec.kind === "pie" && entry) {
      return toPieDatum(spec, options, entry, row);
    }

    const cells = spec.series.map(
      (item, index) => `${item.key}: ${row.values[index] ?? 0}`
    );

    return `${INDENT}{ label: ${toQuoted(row.label)}, ${cells.join(", ")} },`;
  });

  return [`const ${options.dataName} = [`, ...rows, "];"].join("\n");
};

const toConfigCode = (
  items: readonly Series[],
  options: ChartJsxOptions
): string | null => {
  if (!options.isKit) {
    return null;
  }

  const rows = items.map(
    (item) =>
      `${INDENT}${item.key}: { color: ${toQuoted(item.color)}, label: ${toQuoted(item.label)} },`
  );

  return [`const ${options.configName} = {`, ...rows, "};"].join("\n");
};

const isStackedSeries = (spec: ChartSpec): boolean =>
  spec.isStacked && spec.series.length > 1;

const toSeriesNode = (
  spec: ChartSpec,
  item: Series,
  options: ChartJsxOptions
): JsxNode => {
  const color = toFill(item, options);
  const stack = [];

  if (isStackedSeries(spec)) {
    stack.push(toText("stackId", STACK_ID));
  }

  if (spec.kind === "bar") {
    const radius = [];

    if (!isStackedSeries(spec)) {
      radius.push(toExpr("radius", `${BAR_RADIUS}`));
    }

    return toElement(
      "Bar",
      [toText("dataKey", item.key), toText("fill", color), ...radius, ...stack],
      []
    );
  }

  if (spec.kind === "area") {
    return toElement(
      "Area",
      [
        toText("dataKey", item.key),
        toText("fill", color),
        toExpr("fillOpacity", `${FILL_OPACITY}`),
        toText("stroke", color),
        ...stack,
        toText("type", "monotone"),
      ],
      []
    );
  }

  return toElement(
    "Line",
    [
      toText("dataKey", item.key),
      toExpr("dot", "false"),
      toText("stroke", color),
      toExpr("strokeWidth", "2"),
      toText("type", "monotone"),
    ],
    []
  );
};

const toTooltipNode = (options: ChartJsxOptions, isPie: boolean): JsxNode => {
  const content = [];

  if (isPie) {
    content.push(toFlag("hideLabel"));
  }

  if (!options.isKit) {
    return toElement("Tooltip", [], []);
  }

  const inner = toElement("ChartTooltipContent", content, []);

  return toElement(
    "ChartTooltip",
    [toExpr("content", toLines(inner).join(" "))],
    []
  );
};

const toLegendNode = (options: ChartJsxOptions, isPie: boolean): JsxNode => {
  if (!options.isKit) {
    return toElement("Legend", [], []);
  }

  const inner = [];

  if (isPie) {
    inner.push(toText("nameKey", "label"));
  }

  const content = toElement("ChartLegendContent", inner, []);

  return toElement(
    "ChartLegend",
    [toExpr("content", toLines(content).join(" "))],
    []
  );
};

const toAxisNodes = (spec: ChartSpec): JsxNode[] => {
  const grid = [toExpr("vertical", "false")];

  if (spec.kind !== "bar") {
    grid.unshift(toText("strokeDasharray", "3 3"));
  }

  return [
    toElement("CartesianGrid", grid, []),
    toElement(
      "XAxis",
      [
        toExpr("axisLine", "false"),
        toText("dataKey", "label"),
        toExpr("tickLine", "false"),
        toExpr("tickMargin", `${TICK_MARGIN}`),
      ],
      []
    ),
    toElement(
      "YAxis",
      [
        toExpr("axisLine", "false"),
        toExpr("tickLine", "false"),
        toExpr("width", `${AXIS_WIDTH}`),
      ],
      []
    ),
  ];
};

const toCartesian = (
  spec: ChartSpec,
  items: readonly Series[],
  options: ChartJsxOptions
): JsxNode => {
  const isSparkline = spec.kind === "sparkline";
  const tag = CHART_TAGS[spec.kind as keyof typeof CHART_TAGS];

  const parts: JsxNode[] = [];

  const attrs = [
    toFlag("accessibilityLayer"),
    toExpr("data", options.dataName),
  ];

  let seriesSpec = spec;

  if (isSparkline) {
    seriesSpec = { ...spec, kind: "area" };
    attrs.push(toExpr("margin", SPARK_MARGIN));
  } else {
    parts.push(...toAxisNodes(spec));
  }

  parts.push(toTooltipNode(options, false));

  if (spec.hasLegend && !isSparkline) {
    parts.push(toLegendNode(options, false));
  }

  parts.push(...items.map((item) => toSeriesNode(seriesSpec, item, options)));

  return toElement(tag, attrs, parts);
};

const toPie = (spec: ChartSpec, options: ChartJsxOptions): JsxNode => {
  const first = spec.series.at(0)?.key ?? "value";

  const parts = [
    toTooltipNode(options, true),
    toElement(
      "Pie",
      [
        toExpr("data", options.dataName),
        toText("dataKey", first),
        toExpr("innerRadius", `${PIE_INNER}`),
        toText("nameKey", "label"),
        toExpr("strokeWidth", "2"),
      ],
      []
    ),
  ];

  if (spec.hasLegend) {
    parts.push(toLegendNode(options, true));
  }

  return toElement("PieChart", [toFlag("accessibilityLayer")], parts);
};

const toWrapped = (
  spec: ChartSpec,
  chart: JsxNode,
  options: ChartJsxOptions
): JsxNode => {
  if (options.isKit) {
    return toElement(
      "ChartContainer",
      [
        toText("className", `h-[${spec.height}px] w-full`),
        toExpr("config", options.configName),
      ],
      [chart]
    );
  }

  const responsive = toElement(
    "ResponsiveContainer",
    [toText("height", "100%"), toText("width", "100%")],
    [chart]
  );

  return toElement(
    "div",
    [toExpr("style", `{ height: ${spec.height}, width: "100%" }`)],
    [responsive]
  );
};

const toTitled = (
  spec: ChartSpec,
  inner: JsxNode,
  options: ChartJsxOptions
): JsxNode => {
  const hasTitle = spec.title !== null && spec.kind !== "sparkline";

  if (!hasTitle && options.isKit) {
    return inner;
  }

  if (!hasTitle) {
    return toElement("div", [toExpr("style", '{ width: "100%" }')], [inner]);
  }

  const heading = toRawChild(`{${toQuoted(spec.title ?? "")}}`);

  if (options.isKit) {
    return toElement(
      "div",
      [toText("className", "flex w-full flex-col gap-2")],
      [
        toElement("p", [toText("className", "text-sm font-medium")], [heading]),
        inner,
      ]
    );
  }

  const style = `{ fontSize: ${TITLE_FONT}, fontWeight: ${TITLE_WEIGHT}, margin: "0 0 ${TITLE_GAP}px" }`;

  return toElement(
    "div",
    [toExpr("style", '{ width: "100%" }')],
    [toElement("p", [toExpr("style", style)], [heading]), inner]
  );
};

const isKitName = (name: string): boolean => name.startsWith(KIT_PREFIX);

const toTagNames = (code: string): string[] => {
  const found = code.match(NAME_PATTERN) ?? [];

  return [...new Set(found.map((name) => name.slice(1)))].toSorted();
};

const toChartJsx = (spec: ChartSpec, options: ChartJsxOptions): ChartJsx => {
  const pie = toUnique(toPieSeries(spec, options));
  const items = toUnique(toSeries(spec, options));
  let chart = toCartesian(spec, items, options);
  let configItems = items;

  if (spec.kind === "pie") {
    chart = toPie(spec, options);
    configItems = pie;
  }

  const root = toTitled(spec, toWrapped(spec, chart, options), options);
  const markup = toLines(root).join("\n");
  const names = toTagNames(markup);

  return {
    configCode: toConfigCode(configItems, options),
    dataCode: toDataCode(spec, options, pie),
    jsx: markup,
    kitNames: names.filter((name) => isKitName(name)),
    rechartsNames: names.filter((name) => !isKitName(name)),
  };
};

export { toChartJsx };

export type { ChartJsx, ChartJsxOptions };
