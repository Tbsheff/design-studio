import type { StyleValues } from "./css-value-model.js";
import { IN_FLOW } from "./position-model.js";

type ScrollPin = "flow" | "fixed" | "sticky";

type FixedSide = "top" | "bottom";

type ScrollPinPatch = Partial<StyleValues>;

interface ScrollPinOption {
  readonly label: string;
  readonly value: ScrollPin;
}

interface FixedSideOption {
  readonly label: string;
  readonly value: FixedSide;
}

interface ScrollPinCurrent {
  readonly bottom: string;
  readonly left: string;
  readonly right: string;
  readonly top: string;
}

const SCROLL_PIN_OPTIONS: readonly ScrollPinOption[] = [
  { label: "Scroll with parent", value: "flow" },
  { label: "Fixed", value: "fixed" },
  { label: "Sticky", value: "sticky" },
];

const FIXED_SIDE_OPTIONS: readonly FixedSideOption[] = [
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
];

const SCROLL_PIN_TEXT = {
  pin: "Pin to",
  position: "Position",
} as const;

const ZERO = "0px";

const isSet = (value: string): boolean => value !== "" && value !== "auto";

const toScrollPin = (position: string): ScrollPin => {
  if (position === "sticky" || position === "fixed") {
    return position;
  }

  return "flow";
};

const toLockedPin = (position: string): ScrollPin | null => {
  if (position === "absolute") {
    return "flow";
  }

  return null;
};

const toScrollPinValue = (value: string): ScrollPin | null =>
  SCROLL_PIN_OPTIONS.find((option) => option.value === value)?.value ?? null;

const toSideValue = (value: string): FixedSide | null =>
  FIXED_SIDE_OPTIONS.find((option) => option.value === value)?.value ?? null;

const toOffsetSide = (choice: ScrollPin, side: FixedSide): FixedSide | null => {
  if (choice === "sticky") {
    return "top";
  }

  if (choice === "fixed") {
    return side;
  }

  return null;
};

const toFixedSide = (current: ScrollPinCurrent): FixedSide => {
  if (isSet(current.bottom) && !isSet(current.top)) {
    return "bottom";
  }

  return "top";
};

const toKept = (value: string): string => {
  if (isSet(value)) {
    return value;
  }

  return ZERO;
};

const toSidePatch = (
  side: FixedSide,
  current: ScrollPinCurrent
): ScrollPinPatch => {
  if (side === "bottom") {
    return { bottom: toKept(current.bottom), top: "" };
  }

  return { bottom: "", top: toKept(current.top) };
};

const toStretchPatch = (current: ScrollPinCurrent): ScrollPinPatch => {
  if (isSet(current.left) || isSet(current.right)) {
    return {};
  }

  return { left: ZERO, right: ZERO };
};

const toFixedPatch = (
  side: FixedSide,
  current: ScrollPinCurrent
): ScrollPinPatch => ({
  ...toStretchPatch(current),
  ...toSidePatch(side, current),
  position: "fixed",
});

const toScrollPinPatch = (
  choice: ScrollPin,
  current: ScrollPinCurrent
): ScrollPinPatch => {
  if (choice === "flow") {
    return IN_FLOW;
  }

  if (choice === "fixed") {
    return toFixedPatch(toFixedSide(current), current);
  }

  return { bottom: "", position: "sticky", top: toKept(current.top) };
};

const toScrollPinCurrent = (values: StyleValues): ScrollPinCurrent => ({
  bottom: values.bottom,
  left: values.left,
  right: values.right,
  top: values.top,
});

export {
  FIXED_SIDE_OPTIONS,
  SCROLL_PIN_OPTIONS,
  SCROLL_PIN_TEXT,
  toFixedPatch,
  toFixedSide,
  toLockedPin,
  toOffsetSide,
  toScrollPin,
  toScrollPinCurrent,
  toScrollPinPatch,
  toScrollPinValue,
  toSideValue,
};

export type { FixedSide, ScrollPin, ScrollPinCurrent, ScrollPinPatch };
