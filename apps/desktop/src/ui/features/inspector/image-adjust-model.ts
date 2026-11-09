import { copy } from "./copy.js";
import { listTopLevel } from "./shadows-model.js";

type AdjustKey =
  | "brightness"
  | "contrast"
  | "grayscale"
  | "hue-rotate"
  | "saturate";

interface AdjustField {
  readonly key: AdjustKey;
  readonly label: string;
  readonly max: number;
  readonly min: number;
  readonly neutral: number;
  readonly step: number;
  readonly unit: string;
}

const PERCENT_MAX = 200;
const FULL = 100;
const HUE_MAX = 180;
const HUE_STEP = 5;
const PERCENT_STEP = 1;
const DEGREES_PER_TURN = 360;
const RADIANS_PER_HALF_TURN = Math.PI;
const GRADIANS_PER_TURN = 400;
const NO_FILTER = "none";
const HUE_KEY: AdjustKey = "hue-rotate";

const ADJUST_FIELDS: readonly AdjustField[] = [
  {
    key: "brightness",
    label: copy.adjustBrightness,
    max: PERCENT_MAX,
    min: 0,
    neutral: FULL,
    step: PERCENT_STEP,
    unit: "%",
  },
  {
    key: "contrast",
    label: copy.adjustContrast,
    max: PERCENT_MAX,
    min: 0,
    neutral: FULL,
    step: PERCENT_STEP,
    unit: "%",
  },
  {
    key: "saturate",
    label: copy.adjustSaturation,
    max: PERCENT_MAX,
    min: 0,
    neutral: FULL,
    step: PERCENT_STEP,
    unit: "%",
  },
  {
    key: "grayscale",
    label: copy.adjustGrayscale,
    max: FULL,
    min: 0,
    neutral: 0,
    step: PERCENT_STEP,
    unit: "%",
  },
  {
    key: HUE_KEY,
    label: copy.adjustHue,
    max: HUE_MAX,
    min: -HUE_MAX,
    neutral: 0,
    step: HUE_STEP,
    unit: "°",
  },
];

type AdjustValues = Readonly<Record<AdjustKey, number>>;

const CALL_RE = /^(?<name>[a-z-]+)\((?<arg>[^()]*)\)$/iu;
const ANGLE_RE = /^(?<amount>-?\d+(?:\.\d+)?)(?<unit>deg|rad|grad|turn)?$/iu;

const toAngle = (arg: string): number | null => {
  const match = ANGLE_RE.exec(arg.trim());

  if (!match) {
    return null;
  }

  const amount = Number(match.groups?.amount);
  const unit = (match.groups?.unit ?? "deg").toLowerCase();

  if (unit === "rad") {
    return (amount * HUE_MAX) / RADIANS_PER_HALF_TURN;
  }

  if (unit === "grad") {
    return (amount * DEGREES_PER_TURN) / GRADIANS_PER_TURN;
  }

  if (unit === "turn") {
    return amount * DEGREES_PER_TURN;
  }

  return amount;
};

const toRatio = (arg: string): number | null => {
  const text = arg.trim();
  const isPercent = text.endsWith("%");
  const amount = Number(text.replace("%", ""));

  if (text === "" || Number.isNaN(amount)) {
    return null;
  }

  if (isPercent) {
    return amount;
  }

  return amount * FULL;
};

const toAmount = (key: AdjustKey, arg: string): number | null => {
  if (key === HUE_KEY) {
    return toAngle(arg);
  }

  return toRatio(arg);
};

const isAdjustKey = (name: string): name is AdjustKey =>
  ADJUST_FIELDS.some((field) => field.key === name);

const toAdjustValues = (filter: string): AdjustValues => {
  const values: Record<AdjustKey, number> = {
    brightness: FULL,
    contrast: FULL,
    grayscale: 0,
    "hue-rotate": 0,
    saturate: FULL,
  };

  for (const part of listTopLevel(filter, " ")) {
    const call = CALL_RE.exec(part)?.groups;
    const name = (call?.name ?? "").toLowerCase();

    if (call && isAdjustKey(name)) {
      values[name] = toAmount(name, call.arg ?? "") ?? values[name];
    }
  }

  return values;
};

const toTidyNumber = (value: number): string =>
  String(Math.round(value * FULL) / FULL);

const toCall = (field: AdjustField, value: number): string => {
  if (field.key === HUE_KEY) {
    return `${HUE_KEY}(${toTidyNumber(value)}deg)`;
  }

  return `${field.key}(${toTidyNumber(value / FULL)})`;
};

const isNeutral = (field: AdjustField, value: number): boolean =>
  Math.abs(value - field.neutral) < 1 / FULL;

const toKeptParts = (filter: string, key: AdjustKey): string[] => {
  if (filter.trim().toLowerCase() === NO_FILTER) {
    return [];
  }

  return listTopLevel(filter, " ").filter((part) => {
    const name = CALL_RE.exec(part)?.groups?.name ?? "";

    return name.toLowerCase() !== key;
  });
};

const toFilterText = (parts: readonly string[]): string => parts.join(" ");

const toWithAdjust = (
  filter: string,
  field: AdjustField,
  value: number
): string => {
  const parts = toKeptParts(filter, field.key);

  if (!isNeutral(field, value)) {
    parts.push(toCall(field, value));
  }

  return toFilterText(parts);
};

const toWithoutAdjust = (filter: string): string => {
  const keys = new Set<string>(ADJUST_FIELDS.map((field) => field.key));

  if (filter.trim().toLowerCase() === NO_FILTER) {
    return "";
  }

  return toFilterText(
    listTopLevel(filter, " ").filter((part) => {
      const name = CALL_RE.exec(part)?.groups?.name ?? "";

      return !keys.has(name.toLowerCase());
    })
  );
};

const hasAdjust = (values: AdjustValues): boolean =>
  ADJUST_FIELDS.some((field) => !isNeutral(field, values[field.key]));

const toReadout = (field: AdjustField, value: number): string =>
  `${Math.round(value)}${field.unit}`;

export {
  ADJUST_FIELDS,
  hasAdjust,
  toAdjustValues,
  toReadout,
  toWithAdjust,
  toWithoutAdjust,
};

export type { AdjustField, AdjustKey, AdjustValues };
