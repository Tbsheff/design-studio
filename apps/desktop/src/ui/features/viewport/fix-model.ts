import type { RouteOutput, viewportRoutes } from "./deps.js";
import { KIND_TEXT } from "./matrix-model.js";

type FixResultView = RouteOutput<typeof viewportRoutes.applyViewport>;

interface FixRowView {
  readonly detail: string;
  readonly isSkipped: boolean;
  readonly key: string;
  readonly kind: string;
  readonly layer: string;
  readonly width: number;
}

const FIX_MAX_WIDTH = 768;

const toFixWidths = (widths: readonly number[]): readonly number[] =>
  widths.filter((width) => width <= FIX_MAX_WIDTH);

const toFixRows = (result: FixResultView | null): readonly FixRowView[] => {
  if (result === null) {
    return [];
  }

  const applied = result.applied.map((entry, at) => ({
    detail: entry.after,
    isSkipped: false,
    key: `applied-${at}-${entry.layerId}-${entry.width}`,
    kind: KIND_TEXT[entry.kind],
    layer: entry.layerId,
    width: entry.width,
  }));

  const skipped = result.skipped.map((entry, at) => ({
    detail: entry.reason,
    isSkipped: true,
    key: `skipped-${at}-${entry.layerId ?? "none"}-${entry.width}`,
    kind: KIND_TEXT[entry.kind],
    layer: entry.layerId ?? "",
    width: entry.width,
  }));

  return [...applied, ...skipped];
};

const toCountText = (result: FixResultView): string => {
  const total = (rows: FixResultView["before"]): number =>
    rows.reduce(
      (sum, row) =>
        sum +
        row.clippedText +
        row.horizontalScroll +
        row.overflow +
        row.tapTargets,
      0
    );

  return `${total(result.before)} -> ${total(result.after)}`;
};

export { FIX_MAX_WIDTH, toCountText, toFixRows, toFixWidths };

export type { FixResultView, FixRowView };
