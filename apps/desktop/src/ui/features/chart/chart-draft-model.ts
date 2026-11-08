import {
  ROWS_MAX,
  SERIES_MAX,
  toDefaultDraft,
  toPastedTable,
  toUniqueSeries,
} from "./chart-model.js";
import type {
  ChartDraft,
  ChartKind,
  ChartPosition,
  DraftRow,
} from "./chart-model.js";

type DraftAction =
  | { readonly kind: "add-row" }
  | { readonly kind: "add-series" }
  | { readonly kind: "paste"; readonly text: string }
  | { readonly kind: "remove-row"; readonly index: number }
  | { readonly kind: "remove-series"; readonly index: number }
  | {
      readonly kind: "set-cell";
      readonly column: number;
      readonly index: number;
      readonly text: string;
    }
  | { readonly kind: "set-chart-kind"; readonly chart: ChartKind }
  | { readonly kind: "set-legend"; readonly isOn: boolean }
  | { readonly kind: "set-position"; readonly position: ChartPosition }
  | {
      readonly kind: "set-row-label";
      readonly index: number;
      readonly text: string;
    }
  | {
      readonly kind: "set-series-label";
      readonly index: number;
      readonly text: string;
    }
  | { readonly kind: "set-stacked"; readonly isOn: boolean }
  | { readonly kind: "set-title"; readonly text: string };

const toEmptyCells = (count: number): string[] =>
  Array.from({ length: count }, () => "");

const toSeriesLabels = (draft: ChartDraft): string[] =>
  draft.series.map((item) => item.label);

const toRenamedSeries = (
  draft: ChartDraft,
  index: number,
  text: string
): ChartDraft => {
  const labels = toSeriesLabels(draft).map((label, at) => {
    if (at === index) {
      return text;
    }

    return label;
  });

  return { ...draft, series: toUniqueSeries(labels) };
};

const toNewSeries = (draft: ChartDraft): ChartDraft => {
  if (draft.series.length >= SERIES_MAX) {
    return draft;
  }

  const labels = [
    ...toSeriesLabels(draft),
    `Series ${draft.series.length + 1}`,
  ];

  return {
    ...draft,
    rows: draft.rows.map((row) => ({ ...row, values: [...row.values, ""] })),
    series: toUniqueSeries(labels),
  };
};

const toSeriesRemoved = (draft: ChartDraft, index: number): ChartDraft => {
  if (draft.series.length <= 1) {
    return draft;
  }

  const labels = toSeriesLabels(draft).filter((_label, at) => at !== index);

  return {
    ...draft,
    rows: draft.rows.map((row) => ({
      ...row,
      values: row.values.filter((_value, at) => at !== index),
    })),
    series: toUniqueSeries(labels),
  };
};

const toNewRow = (draft: ChartDraft): ChartDraft => {
  if (draft.rows.length >= ROWS_MAX) {
    return draft;
  }

  const row: DraftRow = {
    id: crypto.randomUUID(),
    label: `Row ${draft.rows.length + 1}`,
    values: toEmptyCells(draft.series.length),
  };

  return { ...draft, rows: [...draft.rows, row] };
};

const toRowsMapped = (
  draft: ChartDraft,
  index: number,
  change: (row: DraftRow) => DraftRow
): ChartDraft => ({
  ...draft,
  rows: draft.rows.map((row, at) => {
    if (at === index) {
      return change(row);
    }

    return row;
  }),
});

const toKindChanged = (draft: ChartDraft, chart: ChartKind): ChartDraft => {
  if (chart === draft.kind) {
    return draft;
  }

  const base = toDefaultDraft(chart);

  if (chart === "pie" || draft.kind === "pie") {
    return {
      ...base,
      hasLegend: draft.hasLegend,
      position: draft.position,
      title: draft.title,
    };
  }

  return { ...draft, kind: chart };
};

const toPasted = (draft: ChartDraft, text: string): ChartDraft => {
  const table = toPastedTable(text);

  if (table === null) {
    return draft;
  }

  return { ...draft, rows: table.rows, series: table.series };
};

const toDraftAfter = (draft: ChartDraft, action: DraftAction): ChartDraft => {
  switch (action.kind) {
    case "add-row": {
      return toNewRow(draft);
    }

    case "add-series": {
      return toNewSeries(draft);
    }

    case "paste": {
      return toPasted(draft, action.text);
    }

    case "remove-row": {
      return {
        ...draft,
        rows: draft.rows.filter((_row, at) => at !== action.index),
      };
    }

    case "remove-series": {
      return toSeriesRemoved(draft, action.index);
    }

    case "set-cell": {
      return toRowsMapped(draft, action.index, (row) => ({
        ...row,
        values: row.values.map((value, at) => {
          if (at === action.column) {
            return action.text;
          }

          return value;
        }),
      }));
    }

    case "set-chart-kind": {
      return toKindChanged(draft, action.chart);
    }

    case "set-legend": {
      return { ...draft, hasLegend: action.isOn };
    }

    case "set-position": {
      return { ...draft, position: action.position };
    }

    case "set-row-label": {
      return toRowsMapped(draft, action.index, (row) => ({
        ...row,
        label: action.text,
      }));
    }

    case "set-series-label": {
      return toRenamedSeries(draft, action.index, action.text);
    }

    case "set-stacked": {
      return { ...draft, isStacked: action.isOn };
    }

    case "set-title": {
      return { ...draft, title: action.text };
    }

    default: {
      return draft;
    }
  }
};

export { toDraftAfter };

export type { DraftAction };
