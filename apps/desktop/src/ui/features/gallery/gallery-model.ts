interface CellView {
  readonly contrast: number | null;
  readonly contrastFailure: boolean;
  readonly error: string | null;
  readonly id: string;
  readonly label: string;
  readonly props: Readonly<Record<string, boolean | number | string>>;
  readonly scheme: "dark" | "light";
  readonly state: string;
}

interface ReportView {
  readonly cells: readonly {
    readonly cell: {
      readonly id: string;
      readonly label: string;
      readonly props: Readonly<Record<string, boolean | number | string>>;
      readonly state: string;
    };
    readonly contrast: number | null;
    readonly contrastFailure: boolean;
    readonly error: string | null;
    readonly scheme: "dark" | "light";
  }[];
}

const SHOWN_SCHEME = "light";

const toCellViews = (report: ReportView | null): readonly CellView[] => {
  if (report === null) {
    return [];
  }

  const views: CellView[] = [];

  for (const entry of report.cells) {
    if (entry.scheme === SHOWN_SCHEME) {
      views.push({
        contrast: entry.contrast,
        contrastFailure: entry.contrastFailure,
        error: entry.error,
        id: entry.cell.id,
        label: entry.cell.label,
        props: entry.cell.props,
        scheme: entry.scheme,
        state: entry.cell.state,
      });
    }
  }

  return views;
};

const isFailing = (cell: CellView): boolean =>
  cell.error !== null || cell.contrastFailure;

export { isFailing, toCellViews };

export type { CellView, ReportView };
