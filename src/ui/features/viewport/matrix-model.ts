type Scheme = "both" | "dark" | "light";

type FindingKind =
  | "clipped-text"
  | "horizontal-scroll"
  | "overflow"
  | "tap-target";

interface MatrixFindingView {
  readonly detail: string;
  readonly frameId: string | null;
  readonly kind: FindingKind;
  readonly scheme: "dark" | "light";
  readonly selector: string;
  readonly width: number;
}

interface MatrixReportView {
  readonly contactSheet: string | null;
  readonly findings: readonly MatrixFindingView[];
}

const WIDTH_CHOICES: readonly number[] = [320, 375, 414, 768, 1024, 1280, 1440];

const DEFAULT_WIDTHS: readonly number[] = [375, 768, 1280];

const SCHEMES: readonly Scheme[] = ["light", "dark", "both"];

const MAX_WIDTHS = 6;

const KIND_TEXT: Readonly<Record<FindingKind, string>> = {
  "clipped-text": "Clipped",
  "horizontal-scroll": "Sideways scroll",
  overflow: "Overflow",
  "tap-target": "Tap target",
};

const toggleWidth = (
  current: readonly number[],
  picked: number
): readonly number[] => {
  if (current.includes(picked)) {
    if (current.length === 1) {
      return current;
    }

    return current.filter((width) => width !== picked);
  }

  if (current.length >= MAX_WIDTHS) {
    return current;
  }

  return [...current, picked].toSorted((left, right) => left - right);
};

const countByFrame = (
  findings: readonly MatrixFindingView[]
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();

  for (const finding of findings) {
    if (finding.frameId !== null) {
      counts.set(finding.frameId, (counts.get(finding.frameId) ?? 0) + 1);
    }
  }

  return counts;
};

const cellText = (finding: MatrixFindingView): string =>
  `${finding.width} ${finding.scheme}`;

export {
  cellText,
  countByFrame,
  DEFAULT_WIDTHS,
  KIND_TEXT,
  SCHEMES,
  toggleWidth,
  WIDTH_CHOICES,
};

export type { MatrixFindingView, MatrixReportView, Scheme };
