import type { Classified } from "./classes.js";
import type { CssEdit } from "./map.js";
import type { ClassEdit } from "./plan.js";

type RotateScaleGroup = "rotate" | "scale-x" | "scale-y";

type ScaleAxis = "x" | "y";

const ROTATE_STEPS: ReadonlySet<string> = new Set([
  "0",
  "1",
  "2",
  "3",
  "6",
  "12",
  "45",
  "90",
  "180",
]);

const HALF_TURN = 180;

const FULL_TURN = 360;

const GRAD_DEGREES = 0.9;

const ANGLE_UNITS = new Map([
  ["grad", GRAD_DEGREES],
  ["turn", FULL_TURN],
  ["rad", HALF_TURN / Math.PI],
  ["deg", 1],
]);

const ROUND = 1e6;

const PERCENT = 100;

const ROTATE_SCALE_PROPS = {
  rotate: "rotate",
  scale: "scale-x",
  transform: "transform",
} as const;

const toSingle = (group: RotateScaleGroup): Classified => ({
  group,
  kind: "single",
});

const toArbitrary = (value: string): string =>
  value
    .trim()
    .split(",")
    .map((part) => part.trim())
    .join(",")
    .split(/\s+/u)
    .join("_");

const toRounded = (value: number): number => Math.round(value * ROUND) / ROUND;

const toNumber = (text: string): number | null => {
  if (text.trim() === "") {
    return null;
  }

  const value = Number(text);

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
};

const toDegrees = (value: string): number | null => {
  const text = value.trim();

  for (const [unit, factor] of ANGLE_UNITS) {
    if (text.endsWith(unit)) {
      const amount = toNumber(text.slice(0, -unit.length));

      if (amount === null) {
        return null;
      }

      return toRounded(amount * factor);
    }
  }

  return toNumber(text);
};

const toRotateToken = (value: string): string => {
  const degrees = toDegrees(value);

  if (degrees === null) {
    return `rotate-[${toArbitrary(value)}]`;
  }

  const size = Math.abs(degrees);

  if (!ROTATE_STEPS.has(`${size}`)) {
    return `rotate-[${degrees}deg]`;
  }

  if (degrees < 0) {
    return `-rotate-${size}`;
  }

  return `rotate-${size}`;
};

const toScalePart = (part: string): number | null => {
  if (part.endsWith("%")) {
    const amount = toNumber(part.slice(0, -1));

    if (amount === null) {
      return null;
    }

    return toRounded(amount / PERCENT);
  }

  const amount = toNumber(part);

  if (amount === null) {
    return null;
  }

  return toRounded(amount);
};

const toScalePair = (value: string): readonly [number, number] | null => {
  const text = value.trim();

  if (text === "none") {
    return [1, 1];
  }

  const parts = text.split(/\s+/u).map((part) => toScalePart(part));
  const [x = null, y = x] = parts;

  if (x === null || y === null || parts.includes(null)) {
    return null;
  }

  return [x, y];
};

const toAxisToken = (axis: ScaleAxis, scale: number): string | null => {
  if (scale === 1) {
    return null;
  }

  const size = toRounded(Math.abs(scale) * PERCENT);
  let sign = "";

  if (scale < 0) {
    sign = "-";
  }

  if (Number.isInteger(size)) {
    return `${sign}scale-${axis}-${size}`;
  }

  return `scale-${axis}-[${scale}]`;
};

const toScaleEdits = (value: string | null): CssEdit[] => {
  const pair = toScalePair(value ?? "none");

  if (!pair) {
    return [
      {
        group: "scale-x",
        kind: "single",
        token: `[scale:${toArbitrary(value ?? "")}]`,
      },
      { group: "scale-y", kind: "single", token: null },
    ];
  }

  return [
    { group: "scale-x", kind: "single", token: toAxisToken("x", pair[0]) },
    { group: "scale-y", kind: "single", token: toAxisToken("y", pair[1]) },
  ];
};

const toRotateEdits = (value: string | null): CssEdit[] => {
  const text = value?.trim() ?? "";
  const isCleared = text === "" || text === "none" || toDegrees(text) === 0;

  if (value === null || isCleared) {
    return [{ group: "rotate", kind: "single", token: null }];
  }

  return [{ group: "rotate", kind: "single", token: toRotateToken(text) }];
};

const toRotateScaleEdits = (
  prop: string,
  value: string | null
): CssEdit[] | null => {
  if (prop === "rotate") {
    return toRotateEdits(value);
  }

  if (prop === "scale") {
    return toScaleEdits(value);
  }

  return null;
};

const toTransformToken = (value: string): string => {
  if (value.trim() === "none") {
    return "transform-none";
  }

  return `[transform:${toArbitrary(value)}]`;
};

const toRotateScaleToken = (prop: string, value: string): string | null => {
  if (prop === "transform") {
    return toTransformToken(value);
  }

  if (prop === "rotate") {
    return toRotateToken(value);
  }

  if (prop === "scale") {
    return `[scale:${toArbitrary(value)}]`;
  }

  return null;
};

const toRotateScaleClass = (utility: string): Classified | null => {
  if (/^rotate-(?![xyz]-)/u.test(utility)) {
    return toSingle("rotate");
  }

  if (utility.startsWith("scale-x-")) {
    return toSingle("scale-x");
  }

  if (utility.startsWith("scale-y-")) {
    return toSingle("scale-y");
  }

  return null;
};

const toPropGroup = (group: string): string => {
  if (group === "scale-y") {
    return "scale-x";
  }

  return group;
};

const ROTATE_PART = /(?:^|\s)rotate(?:z)?\([^)]*\)/giu;

const TRANSFORM_CLASS = /^\[transform:(?<value>.+)\]$/u;

const TRANSFORM_UTILITY = /^-?(?:translate|scale|skew)-/u;

type StyleChanges = Record<string, string | null>;

const isRotateWrite = (style: StyleChanges): boolean =>
  Object.hasOwn(style, "rotate") && !Object.hasOwn(style, "transform");

const toTransformWithoutRotate = (value: string): string | null => {
  const rest = value
    .replaceAll(ROTATE_PART, " ")
    .trim()
    .split(/\s+/u)
    .join(" ");

  if (rest === "" || rest === "none") {
    return null;
  }

  return rest;
};

const toTransformClassEdits = (token: string): ClassEdit[] => {
  const value = TRANSFORM_CLASS.exec(token)?.groups?.value ?? null;

  if (value === null || !/rotate(?:z)?\(/iu.test(value)) {
    return [];
  }

  const rest = toTransformWithoutRotate(value.split("_").join(" "));
  const remove: ClassEdit = { kind: "remove", token };

  if (rest === null) {
    return [remove];
  }

  return [remove, { kind: "add", token: `[transform:${toArbitrary(rest)}]` }];
};

const toKeywordEdits = (classes: readonly string[]): ClassEdit[] => {
  const hasOther = classes.some((token) => TRANSFORM_UTILITY.test(token));

  if (hasOther || !classes.includes("transform")) {
    return [];
  }

  return [{ kind: "remove", token: "transform" }];
};

const toRotateTransformEdits = (
  classes: readonly string[],
  style: StyleChanges
): ClassEdit[] => {
  if (!isRotateWrite(style)) {
    return [];
  }

  return [
    ...classes.flatMap((token) => toTransformClassEdits(token)),
    ...toKeywordEdits(classes),
  ];
};

const toRotateTransformChanges = (
  declarations: readonly { readonly prop: string; readonly value: string }[],
  style: StyleChanges
): ReadonlyMap<string, string | null> => {
  const transform =
    declarations.find((entry) => entry.prop === "transform") ?? null;

  if (!isRotateWrite(style) || transform === null) {
    return new Map(Object.entries(style));
  }

  if (!/rotate(?:z)?\(/iu.test(transform.value)) {
    return new Map(Object.entries(style));
  }

  return new Map([
    ...Object.entries(style),
    ["transform", toTransformWithoutRotate(transform.value)],
  ]);
};

export {
  ROTATE_SCALE_PROPS,
  toPropGroup,
  toRotateScaleClass,
  toRotateScaleEdits,
  toRotateScaleToken,
  toRotateTransformChanges,
  toRotateTransformEdits,
};

export type { RotateScaleGroup };
