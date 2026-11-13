import { isFrameId } from "@design-studio/contracts/canvas-file";

const START_POINTS_MAX = 12;

const START_NAME_MAX = 40;

const START_NAME_DEFAULT = "Start";

const CONTROL_RE = /[\p{Cc}<>]/gu;

const SPACE_RE = /\s+/gu;

interface StartPoint {
  readonly frame: string;
  readonly name: string;
}

interface StartFields {
  readonly start?: string;
  readonly starts?: readonly StartPoint[];
}

interface StartFrameRef {
  readonly id: string;
}

const isStartPoint = (value: unknown): value is StartPoint =>
  value instanceof Object &&
  "frame" in value &&
  "name" in value &&
  typeof value.name === "string";

const isStartPointList = (value: unknown): value is readonly StartPoint[] =>
  Array.isArray(value) && value.every((item) => isStartPoint(item));

const toStartName = (raw: string): string | null => {
  const name = raw
    .replaceAll(CONTROL_RE, " ")
    .replaceAll(SPACE_RE, " ")
    .trim()
    .slice(0, START_NAME_MAX)
    .trim();

  if (name === "") {
    return null;
  }

  return name;
};

const toStartNameKey = (name: string): string => name.toLowerCase();

const toCleanPoint = (point: StartPoint): StartPoint | null => {
  const name = toStartName(point.name);

  if (name === null || !isFrameId(point.frame)) {
    return null;
  }

  return { frame: point.frame, name };
};

const toCleanPoints = (points: readonly StartPoint[]): StartPoint[] => {
  const names = new Set<string>();
  const clean: StartPoint[] = [];

  for (const point of points) {
    const next = toCleanPoint(point);

    if (next !== null && !names.has(toStartNameKey(next.name))) {
      names.add(toStartNameKey(next.name));
      clean.push(next);
    }
  }

  return clean.slice(0, START_POINTS_MAX);
};

const toStartFields = (file: StartFields): StartFields => {
  const { start = "" } = file;

  if (!isFrameId(start)) {
    return {};
  }

  const [first = null, ...rest] = toCleanPoints(file.starts ?? []);

  if (first === null) {
    return { start, starts: [{ frame: start, name: START_NAME_DEFAULT }] };
  }

  return { start, starts: [{ frame: start, name: first.name }, ...rest] };
};

const toStartPoints = (file: StartFields): readonly StartPoint[] =>
  toStartFields(file).starts ?? [];

const START_KEYS = new Set(["start", "starts"]);

const toStartless = <File extends StartFields>(file: File): File =>
  Object.fromEntries(
    Object.entries(file).filter(([key]) => !START_KEYS.has(key))
  ) as File;

const withStartPoints = <File extends StartFields>(
  file: File,
  points: readonly StartPoint[]
): File => {
  const [first = null] = points;
  const rest = toStartless(file);

  if (first === null) {
    return rest;
  }

  return { ...rest, start: first.frame, starts: [...points] };
};

const withFirstStart = <File extends StartFields>(
  file: File,
  frame: string
): File => {
  const [first = null, ...rest] = toStartPoints(file);
  const name = first?.name ?? START_NAME_DEFAULT;

  return withStartPoints(file, [{ frame, name }, ...rest]);
};

const startFrameOf = (
  file: StartFields | null,
  frames: readonly StartFrameRef[]
): string => {
  const start = file?.start ?? "";

  if (frames.length === 0) {
    return "f1";
  }

  if (frames.some((frame) => frame.id === start)) {
    return start;
  }

  return frames[0]?.id ?? "f1";
};

export {
  isStartPointList,
  START_NAME_DEFAULT,
  START_NAME_MAX,
  START_POINTS_MAX,
  startFrameOf,
  toStartFields,
  toStartName,
  toStartNameKey,
  toStartPoints,
  withFirstStart,
  withStartPoints,
};

export type { StartFields, StartPoint };
