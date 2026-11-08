import { toNumber } from "./chart-model.js";
import type { ChartDraft } from "./chart-model.js";

type MarkMode = "area" | "fill" | "stroke";

interface PreviewMark {
  readonly colorIndex: number;
  readonly id: string;
  readonly mode: MarkMode;
  readonly path: string;
}

const WIDTH = 240;

const HEIGHT = 96;

const HALF = 2;

const PAD = 6;

const GROUP_SHARE = 0.7;

const CENTER_X = WIDTH / HALF;

const CENTER_Y = HEIGHT / HALF;

const RADIUS = 42;

const QUARTER = Math.PI / 2;

const ROUND_STEP = 10;

const HOLE = 0.55;

const FULL = Math.PI * 2;

const GUARD = 0.0001;

const toMatrix = (draft: ChartDraft): number[][] =>
  draft.rows.map((row) =>
    draft.series.map((_item, index) =>
      Math.max(toNumber(row.values[index] ?? "") ?? 0, 0)
    )
  );

const toMax = (matrix: readonly number[][], isStacked: boolean): number => {
  const tops = matrix.map((row) => {
    if (isStacked) {
      return row.reduce((sum, value) => sum + value, 0);
    }

    return Math.max(...row, 0);
  });

  return Math.max(...tops, 1);
};

const toRound = (value: number): number =>
  Math.round(value * ROUND_STEP) / ROUND_STEP;

const toBars = (draft: ChartDraft, matrix: number[][]): PreviewMark[] => {
  const max = toMax(matrix, draft.isStacked);
  const band = (WIDTH - PAD * HALF) / Math.max(matrix.length, 1);
  const count = draft.series.length;
  const group = band * GROUP_SHARE;
  let width = group / count;

  if (draft.isStacked) {
    width = group;
  }

  return matrix.flatMap((row, rowIndex) => {
    let stack = 0;

    return row.map((value, index) => {
      const high = ((HEIGHT - PAD * HALF) * value) / max;
      let offset = index * width;

      if (draft.isStacked) {
        offset = 0;
      }

      const base = HEIGHT - PAD - stack;
      const left = PAD + rowIndex * band + (band - group) / HALF + offset;

      if (draft.isStacked) {
        stack += high;
      }

      return {
        colorIndex: index,
        id: `${rowIndex}-${index}`,
        mode: "fill",
        path: `M${toRound(left)} ${toRound(base)} h${toRound(width - 1)} v${-toRound(high)} h${-toRound(width - 1)} Z`,
      };
    });
  });
};

const toPoints = (matrix: number[][], index: number): string[] => {
  const max = toMax(matrix, false);
  const step = (WIDTH - PAD * HALF) / Math.max(matrix.length - 1, 1);

  return matrix.map((row, rowIndex) => {
    const level =
      HEIGHT - PAD - ((HEIGHT - PAD * HALF) * (row[index] ?? 0)) / max;

    return `${toRound(PAD + rowIndex * step)} ${toRound(level)}`;
  });
};

const toLines = (draft: ChartDraft, matrix: number[][]): PreviewMark[] =>
  draft.series.flatMap((_item, index) => {
    const points = toPoints(matrix, index);
    const line = `M${points.join(" L")}`;
    const marks: PreviewMark[] = [];

    if (draft.kind !== "line") {
      marks.push({
        colorIndex: index,
        id: `area-${index}`,
        mode: "area",
        path: `${line} L${WIDTH - PAD} ${HEIGHT - PAD} L${PAD} ${HEIGHT - PAD} Z`,
      });
    }

    marks.push({
      colorIndex: index,
      id: `line-${index}`,
      mode: "stroke",
      path: line,
    });

    return marks;
  });

const toPoint = (radius: number, angle: number): string =>
  `${toRound(CENTER_X + radius * Math.cos(angle))} ${toRound(CENTER_Y + radius * Math.sin(angle))}`;

const toPie = (matrix: number[][]): PreviewMark[] => {
  const values = matrix.map((row) => row[0] ?? 0);
  const sum = values.reduce((acc, value) => acc + value, 0);
  const total = Math.max(sum, 1);

  let cursor = -QUARTER;

  return values.map((value, index) => {
    const sweep = Math.min((value / total) * FULL, FULL - GUARD);
    const from = cursor;
    const to = cursor + sweep;
    const large = Number(sweep > Math.PI);

    cursor = to;

    return {
      colorIndex: index,
      id: `slice-${index}`,
      mode: "fill",
      path: `M${toPoint(RADIUS, from)} A${RADIUS} ${RADIUS} 0 ${large} 1 ${toPoint(RADIUS, to)} L${toPoint(RADIUS * HOLE, to)} A${toRound(RADIUS * HOLE)} ${toRound(RADIUS * HOLE)} 0 ${large} 0 ${toPoint(RADIUS * HOLE, from)} Z`,
    };
  });
};

const toPreviewMarks = (draft: ChartDraft): PreviewMark[] => {
  const matrix = toMatrix(draft);

  if (matrix.length === 0) {
    return [];
  }

  if (draft.kind === "pie") {
    return toPie(matrix);
  }

  if (draft.kind === "bar") {
    return toBars(draft, matrix);
  }

  return toLines(draft, matrix);
};

export { HEIGHT, WIDTH, toPreviewMarks };

export type { PreviewMark, MarkMode };
