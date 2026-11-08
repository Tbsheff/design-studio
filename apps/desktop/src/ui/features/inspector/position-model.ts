import type { SelectionContext } from "@design-studio/contracts";

import { PIN_OPTIONS, pinPatch } from "./constraints.js";
import type { InsetProp, PinAxis, PinMode } from "./constraints.js";
import type { DirectEdit } from "./deps.js";

interface PinChange {
  readonly mode: PinMode;
  readonly from: PinMode;
}

interface QueuedPins {
  readonly selector: string;
  readonly pins: Partial<Record<PinAxis, PinChange>>;
}

interface InsetFieldText {
  readonly short: string;
  readonly label: string;
}

interface PinPicked {
  readonly key: string;
  readonly modes: Partial<Record<PinAxis, PinMode>>;
}

const IN_FLOW = { bottom: "", left: "", position: "", right: "", top: "" };

const MARGIN_PROPS = [
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
] as const;

const INSET_FIELDS: Record<InsetProp, InsetFieldText> = {
  bottom: { label: "Bottom", short: "B" },
  left: { label: "Left (X)", short: "X" },
  right: { label: "Right", short: "R" },
  top: { label: "Top (Y)", short: "Y" },
};

const PIN_TIPS: Record<PinAxis, string> = {
  x: "How the element follows when its container gets wider or narrower",
  y: "How the element follows when its container gets taller or shorter",
};

const PIN_SHORT: Record<PinAxis, string> = { x: "H", y: "V" };

const PIN_LABEL: Record<PinAxis, string> = {
  x: "Horizontal constraint",
  y: "Vertical constraint",
};

const RESELECT_FIRST_MS = 400;
const RESELECT_SECOND_MS = 1000;
const RESELECT_THIRD_MS = 2000;
const RESELECT_FOURTH_MS = 3500;
const RESELECT_LAST_MS = 6000;

const PIN_RESELECT_MS = [
  RESELECT_FIRST_MS,
  RESELECT_SECOND_MS,
  RESELECT_THIRD_MS,
  RESELECT_FOURTH_MS,
  RESELECT_LAST_MS,
];

const FLOW_TIP = "Put the element back in the flow";

const ABSOLUTE_TIP =
  "Take the element out of the flow. X and Y count from the nearest positioned ancestor.";

const isPositioned = (value: string): boolean =>
  value === "absolute" || value === "fixed";

const toAbsoluteTip = (isOn: boolean): string => {
  if (isOn) {
    return FLOW_TIP;
  }

  return ABSOLUTE_TIP;
};

const toAbsoluteIcon = (isOn: boolean): "check" | "frame" => {
  if (isOn) {
    return "check";
  }

  return "frame";
};

interface AbsolutePatch {
  readonly left: string;
  readonly position: string;
  readonly top: string;
}

const toAbsolutePatch = (selection: SelectionContext): AbsolutePatch => ({
  left: selection.styles["offset-left"] || "0px",
  position: "absolute",
  top: selection.styles["offset-top"] || "0px",
});

const toPinStyles = (
  edit: DirectEdit,
  selection: SelectionContext
): SelectionContext["styles"] => {
  const margins = MARGIN_PROPS.map((prop) => [prop, edit.values[prop] ?? ""]);

  return { ...selection.styles, ...Object.fromEntries(margins) };
};

const hasPinGeometry = (selection: SelectionContext): boolean =>
  Object.hasOwn(selection.styles, "container-width") &&
  Object.hasOwn(selection.styles, "pin-left");

const toQueuedPins = (
  prev: QueuedPins | null,
  selector: string,
  axis: PinAxis,
  change: PinChange
): QueuedPins => {
  let base: Partial<Record<PinAxis, PinChange>> = {};

  if (prev?.selector === selector) {
    base = prev.pins;
  }

  const from = prev?.pins[axis]?.from ?? change.from;

  return { pins: { ...base, [axis]: { from, mode: change.mode } }, selector };
};

const toActiveQueue = (
  queued: QueuedPins | null,
  selector: string
): QueuedPins | null => {
  if (queued?.selector === selector) {
    return queued;
  }

  return null;
};

const toQueuedPatch = (
  queued: QueuedPins,
  edit: DirectEdit,
  selection: SelectionContext
): ReturnType<typeof pinPatch> => {
  const patch: Record<string, string> = {};
  const styles = toPinStyles(edit, selection);

  for (const axis of ["x", "y"] as const) {
    const pin = queued.pins[axis];

    if (pin) {
      Object.assign(patch, pinPatch(axis, pin.mode, styles, pin.from));
    }
  }

  return patch;
};

const toPinMode = (axis: PinAxis, value: string): PinMode | null => {
  const found = PIN_OPTIONS[axis].find((option) => option.value === value);

  return found?.value ?? null;
};

const toFreshModes = (
  picked: PinPicked,
  key: string
): Partial<Record<PinAxis, PinMode>> => {
  if (picked.key === key) {
    return picked.modes;
  }

  return {};
};

const toPickedModes = (
  prev: PinPicked,
  selector: string,
  key: string,
  next: Partial<Record<PinAxis, PinMode>>
): PinPicked => {
  let base: Partial<Record<PinAxis, PinMode>> = {};

  if (prev.key.startsWith(`${selector}|`)) {
    base = prev.modes;
  }

  return { key, modes: { ...base, ...next } };
};

export {
  IN_FLOW,
  INSET_FIELDS,
  PIN_LABEL,
  PIN_RESELECT_MS,
  PIN_SHORT,
  PIN_TIPS,
  hasPinGeometry,
  isPositioned,
  toAbsoluteIcon,
  toAbsolutePatch,
  toAbsoluteTip,
  toActiveQueue,
  toFreshModes,
  toPickedModes,
  toPinMode,
  toPinStyles,
  toQueuedPatch,
  toQueuedPins,
};

export type { PinChange, PinPicked, QueuedPins };
