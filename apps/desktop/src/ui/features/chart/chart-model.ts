import { copy } from "./copy.js";
import type { RouteInput, RouteOutput, chartRoutes } from "./deps.js";

type InsertInput = RouteInput<typeof chartRoutes.insertChart>;

type InsertOutput = RouteOutput<typeof chartRoutes.insertChart>;

type ChartKind = InsertInput["kind"];

type ChartPosition = NonNullable<InsertInput["position"]>;

interface DraftSeries {
  readonly key: string;
  readonly label: string;
}

interface DraftRow {
  readonly id: string;
  readonly label: string;
  readonly values: readonly string[];
}

interface ChartDraft {
  readonly hasLegend: boolean;
  readonly isStacked: boolean;
  readonly kind: ChartKind;
  readonly position: ChartPosition;
  readonly rows: readonly DraftRow[];
  readonly series: readonly DraftSeries[];
  readonly title: string;
}

interface PastedTable {
  readonly rows: readonly DraftRow[];
  readonly series: readonly DraftSeries[];
}

interface KindOption {
  readonly id: ChartKind;
  readonly label: string;
}

interface PositionOption {
  readonly id: ChartPosition;
  readonly label: string;
}

const SERIES_MAX = 5;

const ROWS_MAX = 60;

const HEIGHT_DEFAULT = 240;

const HEIGHT_SPARK = 64;

const HEIGHT_PIE = 260;

const KINDS: readonly KindOption[] = [
  { id: "bar", label: copy.kindBar },
  { id: "line", label: copy.kindLine },
  { id: "area", label: copy.kindArea },
  { id: "pie", label: copy.kindPie },
  { id: "sparkline", label: copy.kindSparkline },
];

const POSITIONS: readonly PositionOption[] = [
  { id: "inside", label: copy.placeInside },
  { id: "after", label: copy.placeAfter },
  { id: "before", label: copy.placeBefore },
  { id: "replace", label: copy.placeReplace },
];

const SAMPLE_VALUES: readonly number[] = "42 55 49 63 58 71 66 80"
  .split(" ")
  .map(Number);

const SAMPLE_PIE = [
  { label: "Chrome", value: 46 },
  { label: "Safari", value: 28 },
  { label: "Firefox", value: 14 },
  { label: "Other", value: 12 },
] as const;

const KEY_WORD = /[a-z0-9]+/gu;

const LEADING_LETTER = /^[a-z]/u;

const toCapital = (word: string): string =>
  `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;

const toKey = (label: string, index: number): string => {
  const words = label.toLowerCase().match(KEY_WORD) ?? [];

  const joined = words
    .map((word, at) => {
      if (at === 0) {
        return word;
      }

      return toCapital(word);
    })
    .join("");

  if (LEADING_LETTER.test(joined)) {
    return joined;
  }

  return `series${index + 1}`;
};

const toUniqueSeries = (labels: readonly string[]): DraftSeries[] => {
  const seen = new Map<string, number>();

  return labels.map((label, index) => {
    const base = toKey(label, index);
    const count = seen.get(base) ?? 0;

    seen.set(base, count + 1);

    if (count === 0) {
      return { key: base, label };
    }

    return { key: `${base}${count + 1}`, label };
  });
};

const toSampleRows = (kind: ChartKind): DraftRow[] => {
  if (kind === "pie") {
    return SAMPLE_PIE.map((item) => ({
      id: crypto.randomUUID(),
      label: item.label,
      values: [`${item.value}`],
    }));
  }

  return SAMPLE_VALUES.map((value, index) => ({
    id: crypto.randomUUID(),
    label: `Week ${index + 1}`,
    values: [`${value}`],
  }));
};

const toDefaultDraft = (chart: ChartKind): ChartDraft => ({
  hasLegend: true,
  isStacked: false,
  kind: chart,
  position: "inside",
  rows: toSampleRows(chart),
  series: [{ key: "visits", label: "Visits" }],
  title: "",
});

const toHeight = (kind: ChartKind): number => {
  if (kind === "sparkline") {
    return HEIGHT_SPARK;
  }

  if (kind === "pie") {
    return HEIGHT_PIE;
  }

  return HEIGHT_DEFAULT;
};

const toNumber = (text: string): number | null => {
  const trimmed = text.trim().replaceAll(",", "");

  if (trimmed === "") {
    return null;
  }

  const value = Number(trimmed);

  if (Number.isFinite(value)) {
    return value;
  }

  return null;
};

const toRowValues = (
  row: DraftRow,
  count: number
): readonly number[] | null => {
  const values = Array.from({ length: count }, (_unused, index) =>
    toNumber(row.values[index] ?? "")
  );

  if (values.some((value) => value === null)) {
    return null;
  }

  return values.map((value) => value ?? 0);
};

const toChartRows = (
  draft: ChartDraft
): { label: string; values: readonly number[] }[] | null => {
  const used = draft.series.length;
  const rows: { label: string; values: readonly number[] }[] = [];

  for (const row of draft.rows) {
    const values = toRowValues(row, used);

    if (values === null || row.label.trim() === "") {
      return null;
    }

    rows.push({ label: row.label.trim(), values });
  }

  return rows;
};

const toInsertInput = (
  draft: ChartDraft,
  ids: { readonly directionId: string; readonly projectId: string },
  selectedLayer: string
): InsertInput | null => {
  const chartRows = toChartRows(draft);

  if (chartRows === null || chartRows.length === 0) {
    return null;
  }

  let chartTitle: string | null = null;

  if (draft.title.trim() !== "") {
    chartTitle = draft.title.trim();
  }

  return {
    directionId: ids.directionId,
    hasLegend: draft.hasLegend,
    height: toHeight(draft.kind),
    isStacked: draft.isStacked,
    kind: draft.kind,
    layerId: selectedLayer,
    position: draft.position,
    projectId: ids.projectId,
    rows: chartRows,
    series: draft.series,
    title: chartTitle,
  };
};

const toPastedTable = (text: string): PastedTable | null => {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.split("\t"))
    .filter((cells) => cells.some((cell) => cell.trim() !== ""));

  const [head, ...body] = lines;

  if (!head || body.length === 0 || head.length < 2) {
    return null;
  }

  const labels = head.slice(1, SERIES_MAX + 1).map((cell) => cell.trim());
  const series = toUniqueSeries(labels);

  const rows = body.slice(0, ROWS_MAX).map((cells) => ({
    id: crypto.randomUUID(),
    label: (cells[0] ?? "").trim(),
    values: series.map((_item, index) => (cells[index + 1] ?? "").trim()),
  }));

  return { rows, series };
};

const isKind = (value: string): value is ChartKind =>
  KINDS.some((option) => option.id === value);

const isPosition = (value: string): value is ChartPosition =>
  POSITIONS.some((option) => option.id === value);

export {
  HEIGHT_DEFAULT,
  KINDS,
  POSITIONS,
  ROWS_MAX,
  SERIES_MAX,
  isKind,
  isPosition,
  toDefaultDraft,
  toInsertInput,
  toNumber,
  toPastedTable,
  toUniqueSeries,
};

export type {
  ChartDraft,
  ChartKind,
  ChartPosition,
  DraftRow,
  DraftSeries,
  InsertInput,
  InsertOutput,
  KindOption,
  PastedTable,
  PositionOption,
};
