import type { Classified, Side, SideValue, SingleGroup } from "./classes.js";
import type { CssEdit } from "./map.js";
import type { TailwindTheme } from "./theme-model.js";
import { lengthToPx } from "./units.js";

type BoxSide = "t" | "r" | "b" | "l";

type SideMap = Partial<Record<Side, SideValue>>;

const BOX_ORDER: readonly BoxSide[] = ["t", "r", "b", "l"];

const PX_TOLERANCE = 0.01;

const TAILWIND_V4 = 4;

const V3_WIDTHS: ReadonlySet<string> = new Set(["0", "2", "4", "8"]);

const BORDER_CLASS = /^border(?:-(?<side>[xytrblse]))?(?:-(?<suffix>.+))?$/u;

const VAR_VALUE = /^var\((?<name>--[\w-]+)(?:,[^)]*)?\)$/u;

const BORDER_SIDES = new Map<string, readonly Side[]>([
  ["", BOX_ORDER],
  ["b", ["b"]],
  ["e", ["r"]],
  ["l", ["l"]],
  ["r", ["r"]],
  ["s", ["l"]],
  ["t", ["t"]],
  ["x", ["l", "r"]],
  ["y", ["t", "b"]],
]);

const BORDER_PREFIX = Object.fromEntries([
  ["all", "border"],
  ["b", "border-b"],
  ["l", "border-l"],
  ["r", "border-r"],
  ["t", "border-t"],
  ["x", "border-x"],
  ["y", "border-y"],
]);

const BORDER_PROPS = new Map<string, readonly BoxSide[]>([
  ["border-bottom-width", ["b"]],
  ["border-left-width", ["l"]],
  ["border-right-width", ["r"]],
  ["border-top-width", ["t"]],
  ["border-width", BOX_ORDER],
]);

const SIDE_PROP = new Map<Side, string>([
  ["b", "border-bottom-width"],
  ["l", "border-left-width"],
  ["r", "border-right-width"],
  ["t", "border-top-width"],
]);

const BORDER_STYLES: ReadonlySet<string> = new Set([
  "solid",
  "dashed",
  "dotted",
  "double",
  "hidden",
  "none",
]);

const toBracketInner = (suffix: string): string | null => {
  const isSquare = suffix.startsWith("[") && suffix.endsWith("]");
  const isRound = suffix.startsWith("(") && suffix.endsWith(")");

  if (isSquare || isRound) {
    return suffix.slice(1, -1);
  }

  return null;
};

const isBorderLength = (inner: string): boolean => {
  if (/^(?:length|size|percentage):/u.test(inner)) {
    return true;
  }

  if (/^(?:color|family-name|number):/u.test(inner)) {
    return false;
  }

  return (
    lengthToPx(inner.replaceAll("_", " ")) !== null || inner.startsWith("calc(")
  );
};

const isBorderWidthSuffix = (suffix: string): boolean => {
  if (suffix === "" || /^\d+$/u.test(suffix)) {
    return true;
  }

  const inner = toBracketInner(suffix);

  return inner !== null && isBorderLength(inner);
};

const toBorderWidthClass = (utility: string): Classified | null => {
  const match = BORDER_CLASS.exec(utility);

  if (!match) {
    return null;
  }

  const sides = BORDER_SIDES.get(match.groups?.side ?? "");
  const suffix = match.groups?.suffix ?? "";

  if (!sides || !isBorderWidthSuffix(suffix)) {
    return null;
  }

  return {
    group: "border",
    kind: "sided",
    sides: [...sides],
    value: { negative: false, suffix },
  };
};

const toBorderGroup = (suffix: string): SingleGroup | null => {
  if (BORDER_STYLES.has(suffix)) {
    return "border-style";
  }

  if (
    /^[xytrblse](?:-|$)/u.test(suffix) ||
    /^(?:collapse|separate|spacing)/u.test(suffix)
  ) {
    return null;
  }

  return "border-color";
};

const isWholeWidth = (whole: number, theme: TailwindTheme): boolean => {
  if (theme.version === TAILWIND_V4) {
    return whole >= 0;
  }

  return V3_WIDTHS.has(`${whole}`);
};

const toVarSuffix = (name: string, theme: TailwindTheme): string => {
  if (theme.version === TAILWIND_V4) {
    return `(length:${name})`;
  }

  return `[length:var(${name})]`;
};

const toBorderWidthSuffix = (value: string, theme: TailwindTheme): string => {
  const px = lengthToPx(value);

  if (px !== null) {
    const whole = Math.round(px);

    if (Math.abs(px - 1) < PX_TOLERANCE) {
      return "";
    }

    if (Math.abs(px - whole) < PX_TOLERANCE && isWholeWidth(whole, theme)) {
      return `${whole}`;
    }
  }

  const name =
    VAR_VALUE.exec(value.replaceAll(/\s/gu, ""))?.groups?.name ?? null;

  if (name) {
    return toVarSuffix(name, theme);
  }

  const parts = value
    .trim()
    .split(",")
    .map((part) => part.trim());

  return `[${parts.join(",").replaceAll(/\s+/gu, "_")}]`;
};

const toBoxParts = (value: string, count: number): readonly string[] | null => {
  if (count === 1 || value.includes("(")) {
    return BOX_ORDER.slice(0, count).map(() => value);
  }

  const parts = value.trim().split(/\s+/u);
  const [top, right = top, bottom = top, left = right] = parts;

  if (!top || parts.length > BOX_ORDER.length) {
    return null;
  }

  return [top, right ?? top, bottom ?? top, left ?? top];
};

const toBorderValue = (part: string, theme: TailwindTheme): SideValue => ({
  negative: false,
  suffix: toBorderWidthSuffix(part, theme),
});

const toBorderEdits = (
  prop: string,
  value: string | null,
  theme: TailwindTheme
): CssEdit[] | null => {
  const sides = BORDER_PROPS.get(prop);

  if (!sides) {
    return null;
  }

  if (value === null) {
    return [
      {
        group: "border",
        kind: "sided",
        values: Object.fromEntries(sides.map((side) => [side, null])),
      },
    ];
  }

  const parts = toBoxParts(value, sides.length);

  if (!parts) {
    return null;
  }

  const values = Object.fromEntries(
    sides.map((side, index) => [
      side,
      toBorderValue(parts[index] ?? value, theme),
    ])
  );

  return [{ group: "border", kind: "sided", values }];
};

const isBorderWidthProperty = (prop: string): boolean => BORDER_PROPS.has(prop);

const toBorderClassProps = (sides: readonly Side[]): string[] => [
  ...sides.flatMap((side) => SIDE_PROP.get(side) ?? []),
  "border-width",
];

const toBorderSideMap = (map: SideMap): SideMap => {
  const isAllZero = BOX_ORDER.every((side) => map[side]?.suffix === "0");

  if (isAllZero) {
    return map;
  }

  return Object.fromEntries(
    Object.entries(map).filter(([, value]) => value.suffix !== "0")
  );
};

const toSplitValues = (value: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of value.trim()) {
    if (char === "(") {
      depth += 1;
    }

    if (char === ")") {
      depth -= 1;
    }

    if (/\s/u.test(char) && depth === 0) {
      if (current) {
        parts.push(current);
      }

      current = "";
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
};

const toFourParts = (
  value: string
): readonly [string, string, string, string] | null => {
  const parts = toSplitValues(value);
  const [top, right, bottom, left] = parts;

  if (!top || parts.length > BOX_ORDER.length) {
    return null;
  }

  const across = right ?? top;

  return [top, across, bottom ?? top, left ?? across];
};

const toCornerValues = (
  value: string
): Record<"tl" | "tr" | "br" | "bl", string> | null => {
  const parts = toFourParts(value);

  if (!parts || value.includes("/")) {
    return null;
  }

  const [topLeft, topRight, bottomRight, bottomLeft] = parts;

  return { bl: bottomLeft, br: bottomRight, tl: topLeft, tr: topRight };
};

const toBoxValues = (
  value: string
): Readonly<Record<string, string>> | null => {
  const parts = toFourParts(value);

  if (!parts) {
    return null;
  }

  return Object.fromEntries(
    BOX_ORDER.map((side, index) => [side, parts[index] ?? parts[0]])
  );
};

export {
  BORDER_PREFIX,
  isBorderWidthProperty,
  isBorderWidthSuffix,
  toBorderClassProps,
  toBorderEdits,
  toBorderGroup,
  toBorderSideMap,
  toBorderWidthClass,
  toBoxValues,
  toCornerValues,
  toSplitValues,
};
