type ChartKind = "area" | "bar" | "line" | "pie" | "sparkline";

interface ChartSeries {
  readonly key: string;
  readonly label: string;
}

interface ChartRow {
  readonly label: string;
  readonly values: readonly number[];
}

interface ChartSpec {
  readonly hasLegend: boolean;
  readonly height: number;
  readonly isStacked: boolean;
  readonly kind: ChartKind;
  readonly rows: readonly ChartRow[];
  readonly series: readonly ChartSeries[];
  readonly title: string | null;
}

export type { ChartKind, ChartRow, ChartSeries, ChartSpec };
