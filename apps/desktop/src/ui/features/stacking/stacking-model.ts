import { parseVariant, STACKING_SIDES, Z_SCALE } from "./deps.js";
import type {
  StackingInfo,
  StackingPosition,
  StackingSide,
  StackingValue,
} from "./deps.js";

type StackingField =
  | "bottom"
  | "left"
  | "overflowX"
  | "overflowY"
  | "position"
  | "right"
  | "top"
  | "zIndex";

type OverflowAxis = "overflowX" | "overflowY";

type StackingEdit = Readonly<Partial<Record<StackingField, string | null>>>;

const INSET_POSITIONS: ReadonlySet<string> = new Set([
  "sticky",
  "fixed",
  "absolute",
]);

const toSteps = (): readonly number[] => {
  const steps: number[] = [];

  for (const step of Z_SCALE) {
    if (step !== "auto") {
      steps.push(Number(step));
    }
  }

  return steps;
};

const Z_STEPS = toSteps();

const Z_TOP = Math.max(...Z_STEPS);

const VAR_TOKEN = /^var\(\s*(?<name>--[\w-]+)\s*\)$/u;

const NUMBER = /^-?\d+(?:\.\d+)?$/u;

const breakpointOf = (variant: string): string => {
  const parsed = parseVariant(variant);

  if (parsed === null || parsed.breakpoint === null) {
    return "base";
  }

  return parsed.breakpoint;
};

const shownValue = (value: StackingValue): string => {
  if (value.token !== null) {
    return value.token;
  }

  return value.value ?? "";
};

const positionOf = (info: StackingInfo | null): StackingPosition | "" => {
  const value = info?.position.value ?? "";

  return value as StackingPosition | "";
};

const isInsetShown = (position: string): boolean =>
  INSET_POSITIONS.has(position);

const hasNoInset = (info: StackingInfo): boolean =>
  STACKING_SIDES.every((side: StackingSide) => info.inset[side].value === null);

const positionEdit = (
  next: string,
  info: StackingInfo | null
): StackingEdit => {
  if (next === "") {
    return { position: null };
  }

  if (next === "sticky" && info !== null && hasNoInset(info)) {
    return { position: next, top: "0" };
  }

  return { position: next };
};

const cleanOffset = (raw: string): string | null => {
  const text = raw.trim();

  if (text === "") {
    return null;
  }

  return text;
};

const nearestStep = (value: number): string => {
  let best = Z_STEPS[0] ?? 0;

  for (const step of Z_STEPS) {
    if (Math.abs(step - value) < Math.abs(best - value)) {
      best = step;
    }
  }

  return String(best);
};

const snapZ = (raw: string): string | null => {
  const text = raw.trim();

  if (text === "") {
    return null;
  }

  const token = VAR_TOKEN.exec(text)?.groups?.name ?? null;

  if (token !== null) {
    return token;
  }

  if (text === "auto" || text.startsWith("--")) {
    return text;
  }

  if (!NUMBER.test(text)) {
    return text;
  }

  const value = Number(text);

  if (value < 0 || value > Z_TOP) {
    return String(Math.round(value));
  }

  return nearestStep(value);
};

export {
  breakpointOf,
  cleanOffset,
  isInsetShown,
  positionEdit,
  positionOf,
  shownValue,
  snapZ,
};

export type { OverflowAxis, StackingEdit, StackingField };
