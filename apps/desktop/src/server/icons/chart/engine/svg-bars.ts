import { toBand, toBandX, toColor, toY } from "./svg-frame.js";
import type { Frame } from "./svg-frame.js";
import { toNode, toRounded } from "./svg-markup.js";
import type { SvgNode } from "./svg-markup.js";

const GROUP_SHARE = 0.72;

const BAR_RADIUS = 3;

const BAR_GAP = 2;

const toBarWidth = (frame: Frame, group: number): number => {
  if (frame.spec.isStacked) {
    return group;
  }

  return group / frame.spec.series.length;
};

interface BarSpan {
  readonly high: number;
  readonly low: number;
}

interface StackRange {
  readonly from: number;
  readonly to: number;
}

const toBarSpan = (frame: Frame, value: number, stack: StackRange): BarSpan => {
  if (frame.spec.isStacked) {
    return { high: toY(frame, stack.to), low: toY(frame, stack.from) };
  }

  return {
    high: toY(frame, Math.max(value, 0)),
    low: toY(frame, Math.min(value, 0)),
  };
};

const toBars = (frame: Frame): SvgNode[] => {
  const { spec } = frame;
  const group = toBand(frame) * GROUP_SHARE;
  const width = toRounded(toBarWidth(frame, group));
  const spread = Number(!spec.isStacked);

  return spec.rows.flatMap((row, rowIndex) => {
    let total = 0;

    return spec.series.map((_item, index) => {
      const value = row.values[index] ?? 0;
      const from = total;

      total += Math.max(value, 0);

      const { high, low } = toBarSpan(frame, value, { from, to: total });
      const offset = spread * index * width;
      const span = toRounded(Math.abs(low - high));

      return toNode(
        "rect",
        {
          fill: toColor(frame.colors, index),
          height: Math.max(span, 1),
          rx: BAR_RADIUS,
          width: Math.max(toRounded(width - BAR_GAP), 1),
          x: toRounded(toBandX(frame, rowIndex) - group / 2 + offset + 1),
          y: Math.min(high, low),
        },
        []
      );
    });
  });
};

export { toBars };
