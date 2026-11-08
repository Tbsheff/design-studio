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

const isSet = (value: string | undefined): boolean => {
  const text = (value ?? "").trim();

  return text !== "" && text !== "auto";
};

const pinModeOf = (axis: PinAxis, styles: Record<string, string>): PinMode => {
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

const px = (value: number): string => `${Number(value.toFixed(2))}px`;

const percent = (value: number): string => `${Number(value.toFixed(2))}%`;

const centered = (offset: number): string => {
  const rounded = Number(offset.toFixed(2));

  if (rounded === 0) {
    return "50%";
  }

  return `calc(50% ${rounded < 0 ? "-" : "+"} ${Math.abs(rounded)}px)`;
};

const numberOf = (styles: Record<string, string>, key: string): number => {
  const value = Number.parseFloat(styles[key] ?? "");

  return Number.isFinite(value) ? value : 0;
};

const pinPatch = (
  axis: PinAxis,
  mode: PinMode,
  styles: Record<string, string>,
  current: PinMode = pinModeOf(axis, styles)
): Record<string, string> => {
  const keys = AXES[axis];
  const pos = numberOf(styles, keys.offset);
  const size = numberOf(styles, keys.box);

  const inner =
    styles[keys.inner] === undefined ? size : numberOf(styles, keys.inner);

  const box = numberOf(styles, keys.container);

  const margins =
    numberOf(styles, `margin-${keys.start}`) +
    numberOf(styles, `margin-${keys.end}`);

  const endOffset = px(box - pos - size - margins);
  const shrinkWidth = axis === "x" && !isSet(styles["authored-width"]);

  const fixed =
    current === "both" || current === "scale" || shrinkWidth
      ? { [keys.size]: px(inner) }
      : {};

  if (mode === "end") {
    return { [keys.start]: "", [keys.end]: endOffset, ...fixed };
  }

  if (mode === "both") {
    return { [keys.start]: px(pos), [keys.end]: endOffset, [keys.size]: "" };
  }

  if (mode === "center") {
    return { [keys.start]: centered(pos - box / 2), [keys.end]: "", ...fixed };
  }

  if (mode === "scale" && box > 0) {
    return {
      [keys.start]: percent((pos / box) * 100),
      [keys.end]: "",
      [keys.size]: percent((inner / box) * 100),
    };
  }

  return { [keys.start]: px(pos), [keys.end]: "", ...fixed };
};

const pinFields = (axis: PinAxis, mode: PinMode): InsetProp[] => {
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

export { PIN_OPTIONS, pinModeOf, pinPatch, pinFields };

export type { PinMode, PinAxis, InsetProp };
