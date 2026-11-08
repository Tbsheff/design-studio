import { AREA_FILL, toColor, toPointX, toY } from "./svg-frame.js";
import type { Frame } from "./svg-frame.js";
import { toNode } from "./svg-markup.js";
import type { SvgNode } from "./svg-markup.js";

type Point = readonly [number, number];

const ATTR_PATH = "d";

const ATTR_RADIUS = "r";

const DOTS_MAX = 12;

const DOT_RADIUS = 3;

const LINE_WIDTH = 2;

const toLevels = (frame: Frame): number[][] => {
  const { spec } = frame;
  const running = spec.rows.map(() => 0);

  return spec.series.map((_item, index) =>
    spec.rows.map((row, rowIndex) => {
      const value = row.values[index] ?? 0;

      if (!spec.isStacked) {
        return value;
      }

      const total = (running[rowIndex] ?? 0) + Math.max(value, 0);

      running[rowIndex] = total;

      return total;
    })
  );
};

const RADIUS_ATTRS = { [ATTR_RADIUS]: DOT_RADIUS } as const;

const toPath = (points: readonly Point[]): string =>
  points
    .map(([px, py], index) => {
      if (index === 0) {
        return `M${px} ${py}`;
      }

      return `L${px} ${py}`;
    })
    .join(" ");

const toPoints = (frame: Frame, levels: readonly number[]): Point[] =>
  levels.map((level, index) => [toPointX(frame, index), toY(frame, level)]);

const toLineNode = (color: string, points: readonly Point[]): SvgNode =>
  toNode(
    "path",
    {
      [ATTR_PATH]: toPath(points),
      fill: "none",
      stroke: color,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-width": LINE_WIDTH,
    },
    []
  );

const toDotNodes = (color: string, points: readonly Point[]): SvgNode[] => {
  if (points.length > DOTS_MAX) {
    return [];
  }

  return points.map(([px, py]) =>
    toNode("circle", { ...RADIUS_ATTRS, cx: px, cy: py, fill: color }, [])
  );
};

const toAreaNode = (
  color: string,
  upper: readonly Point[],
  lower: readonly Point[]
): SvgNode =>
  toNode(
    "path",
    {
      [ATTR_PATH]: `${toPath([...upper, ...lower.toReversed()])} Z`,
      fill: color,
      "fill-opacity": AREA_FILL,
    },
    []
  );

const toLowerEdge = (
  frame: Frame,
  all: readonly number[][],
  index: number
): Point[] => {
  const below = all[index - 1] ?? null;

  if (frame.spec.isStacked && below !== null) {
    return toPoints(frame, below);
  }

  return toPoints(frame, all[index] ?? []).map(([px]) => [px, toY(frame, 0)]);
};

const toLines = (frame: Frame): SvgNode[] => {
  const all = toLevels(frame);
  const isFilled = frame.spec.kind !== "line";
  const hasDots = frame.spec.kind !== "sparkline";

  return all.flatMap((levels, index) => {
    const color = toColor(frame.colors, index);
    const upper = toPoints(frame, levels);
    const nodes: SvgNode[] = [];

    if (isFilled) {
      nodes.push(toAreaNode(color, upper, toLowerEdge(frame, all, index)));
    }

    nodes.push(toLineNode(color, upper));

    if (hasDots) {
      nodes.push(...toDotNodes(color, upper));
    }

    return nodes;
  });
};

export { toLines };
