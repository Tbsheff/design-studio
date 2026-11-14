import type { FlipAxis } from "../../../shared/flip.js";

const PERCENT = 100;

const toScalePart = (part: string): number => {
  if (part.endsWith("%")) {
    return Number(part.slice(0, -1)) / PERCENT;
  }

  return Number(part);
};

const toScalePair = (scale: string): readonly [number, number] => {
  const text = scale.trim();

  if (text === "" || text === "none") {
    return [1, 1];
  }

  const [first = "1", second = first] = text.split(" ");
  const x = toScalePart(first);
  const y = toScalePart(second);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return [1, 1];
  }

  return [x, y];
};

const toFlippedScale = (scale: string, axis: FlipAxis): string => {
  const [x, y] = toScalePair(scale);
  let next: readonly [number, number] = [x, -y];

  if (axis === "x") {
    next = [-x, y];
  }

  if (next[0] === 1 && next[1] === 1) {
    return "";
  }

  return `${next[0]} ${next[1]}`;
};

const toRotationDegrees = (rotate: string): number => {
  const text = rotate.trim();

  if (!text.endsWith("deg")) {
    return 0;
  }

  const degrees = Number(text.slice(0, -"deg".length));

  if (!Number.isFinite(degrees)) {
    return 0;
  }

  return degrees;
};

const isRotated = (rotate: string): boolean => toRotationDegrees(rotate) !== 0;

const toRotationDisplay = (rotate: string): string =>
  `${toRotationDegrees(rotate)}°`;

export { isRotated, toFlippedScale, toRotationDegrees, toRotationDisplay };
