import {
  START_NAME_DEFAULT,
  START_POINTS_MAX,
  toStartName,
  toStartNameKey,
} from "@design-studio/contracts/start-points";
import type { StartPoint } from "@design-studio/contracts/start-points";

interface StartPick {
  readonly frame: string;
  readonly count: number;
}

const NO_INDEX = -1;

const isStartFull = (points: readonly StartPoint[]): boolean =>
  points.length >= START_POINTS_MAX;

const hasStartName = (
  points: readonly StartPoint[],
  name: string,
  skip: number
): boolean =>
  points.some(
    (point, index) =>
      index !== skip && toStartNameKey(point.name) === toStartNameKey(name)
  );

const toFreeStartName = (
  points: readonly StartPoint[],
  base: string
): string => {
  const name = toStartName(base) ?? START_NAME_DEFAULT;

  if (!hasStartName(points, name, NO_INDEX)) {
    return name;
  }

  const counts = Array.from(
    { length: START_POINTS_MAX },
    (_slot, index) => index + 2
  );

  const free = counts.find(
    (count) => !hasStartName(points, `${name} ${count}`, NO_INDEX)
  );

  return `${name} ${free ?? points.length + 1}`;
};

const toAddedPoints = (
  points: readonly StartPoint[],
  frame: string,
  name: string
): readonly StartPoint[] => [...points, { frame, name }];

const toRenamedPoint = (
  point: StartPoint,
  isTarget: boolean,
  name: string
): StartPoint => {
  if (isTarget) {
    return { ...point, name };
  }

  return point;
};

const toRenamedPoints = (
  points: readonly StartPoint[],
  target: number,
  name: string
): readonly StartPoint[] =>
  points.map((point, index) => toRenamedPoint(point, index === target, name));

const toRemovedPoints = (
  points: readonly StartPoint[],
  target: number
): readonly StartPoint[] => points.filter((_point, index) => index !== target);

const toCurrentStart = (pick: StartPick | null, fallback: string): string =>
  pick?.frame ?? fallback;

const toCurrentStartName = (
  points: readonly StartPoint[],
  currentId: string
): string =>
  points.find((point) => point.frame === currentId)?.name ??
  points[0]?.name ??
  START_NAME_DEFAULT;

const toNextPick = (pick: StartPick | null, frame: string): StartPick => ({
  count: (pick?.count ?? 0) + 1,
  frame,
});

export {
  hasStartName,
  isStartFull,
  toAddedPoints,
  toCurrentStart,
  toCurrentStartName,
  toFreeStartName,
  toNextPick,
  toRemovedPoints,
  toRenamedPoints,
};

export type { StartPick };
