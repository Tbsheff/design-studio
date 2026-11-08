type PinMode = "start" | "end" | "both" | "center" | "scale";

type PinAxis = "x" | "y";

type InsetProp = "left" | "right" | "top" | "bottom";

interface AxisKeys {
  readonly start: InsetProp;
  readonly end: InsetProp;
  readonly size: "width" | "height";
  readonly offset: string;
  readonly container: string;
  readonly box: string;
  readonly inner: string;
}

const AXES: Record<PinAxis, AxisKeys> = {
  x: {
    box: "box-width",
    container: "container-width",
    end: "right",
    inner: "size-width",
    offset: "pin-left",
    size: "width",
    start: "left",
  },
  y: {
    box: "box-height",
    container: "container-height",
    end: "bottom",
    inner: "size-height",
    offset: "pin-top",
    size: "height",
    start: "top",
  },
};

const PIN_OPTIONS: Record<
  PinAxis,
  { readonly value: PinMode; readonly label: string }[]
> = {
  x: [
    { label: "Left", value: "start" },
    { label: "Right", value: "end" },
    { label: "Left and right", value: "both" },
    { label: "Center", value: "center" },
    { label: "Scale", value: "scale" },
  ],
  y: [
    { label: "Top", value: "start" },
    { label: "Bottom", value: "end" },
    { label: "Top and bottom", value: "both" },
    { label: "Center", value: "center" },
    { label: "Scale", value: "scale" },
  ],
};

const isSet = (value: string): boolean => {
  const text = value.trim();

  return text !== "" && text !== "auto";
};

const toPinMode = (axis: PinAxis, styles: Record<string, string>): PinMode => {
  const keys = AXES[axis];
  const start = styles[`authored-${keys.start}`] ?? "";
  const end = styles[`authored-${keys.end}`] ?? "";

  if (isSet(start) && isSet(end)) {
    return "both";
  }

  if (isSet(end)) {
    return "end";
  }

  if (start.includes("50%")) {
    return "center";
  }

  if (/%\s*$/u.test(start)) {
    return "scale";
  }

  return "start";
};

const PERCENT = 100;

const toPx = (value: number): string => `${Number(value.toFixed(2))}px`;

const toPercent = (value: number): string => `${Number(value.toFixed(2))}%`;

const toCentered = (offset: number): string => {
  const rounded = Number(offset.toFixed(2));

  if (rounded === 0) {
    return "50%";
  }

  let sign = "+";

  if (rounded < 0) {
    sign = "-";
  }

  return `calc(50% ${sign} ${Math.abs(rounded)}px)`;
};

const toNumber = (styles: Record<string, string>, key: string): number => {
  const match = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)/u.exec(styles[key] ?? "");

  if (match) {
    return Number(match[0]);
  }

  return 0;
};

type StyleEntry = readonly [string, string];

type StylePatch = Readonly<Record<string, string>>;

const toStylePatch = (entries: readonly StyleEntry[]): StylePatch =>
  Object.fromEntries(entries);

const toInnerSize = (
  styles: Record<string, string>,
  key: string,
  fallback: number
): number => {
  if (key in styles) {
    return toNumber(styles, key);
  }

  return fallback;
};

const toPinPatch = (
  axis: PinAxis,
  mode: PinMode,
  styles: Record<string, string>,
  current: PinMode | null
): StylePatch => {
  const keys = AXES[axis];
  const pos = toNumber(styles, keys.offset);
  const size = toNumber(styles, keys.box);

  const inner = toInnerSize(styles, keys.inner, size);

  const box = toNumber(styles, keys.container);

  const margins =
    toNumber(styles, `margin-${keys.start}`) +
    toNumber(styles, `margin-${keys.end}`);

  const endOffset = toPx(box - pos - size - margins);
  const shrinkWidth = axis === "x" && !isSet(styles["authored-width"] ?? "");

  const currentMode = current ?? toPinMode(axis, styles);
  const fixed: StyleEntry[] = [];

  if (currentMode === "both" || currentMode === "scale" || shrinkWidth) {
    fixed.push([keys.size, toPx(inner)]);
  }

  if (mode === "end") {
    return toStylePatch([[keys.start, ""], [keys.end, endOffset], ...fixed]);
  }

  if (mode === "both") {
    return toStylePatch([
      [keys.start, toPx(pos)],
      [keys.end, endOffset],
      [keys.size, ""],
    ]);
  }

  if (mode === "center") {
    return toStylePatch([
      [keys.start, toCentered(pos - box / 2)],
      [keys.end, ""],
      ...fixed,
    ]);
  }

  if (mode === "scale" && box > 0) {
    return toStylePatch([
      [keys.start, toPercent((pos / box) * PERCENT)],
      [keys.end, ""],
      [keys.size, toPercent((inner / box) * PERCENT)],
    ]);
  }

  return toStylePatch([[keys.start, toPx(pos)], [keys.end, ""], ...fixed]);
};

const toPinFields = (axis: PinAxis, mode: PinMode): InsetProp[] => {
  const keys = AXES[axis];

  if (mode === "start") {
    return [keys.start];
  }

  if (mode === "end") {
    return [keys.end];
  }

  if (mode === "both") {
    return [keys.start, keys.end];
  }

  return [];
};

export { PIN_OPTIONS, toPinMode, toPinPatch, toPinFields };

export type { PinMode, PinAxis, InsetProp };
