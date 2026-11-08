import type { SelectionContext } from "@design-studio/contracts";
import type { PointerEvent as ReactPointerEvent } from "react";

import { toParsedNumber } from "./css-value-model.js";
import type { DirectEdit } from "./deps.js";
import { toSizeFacts, toSizePatch } from "./sizing-model.js";
import type { Axis, ParentLayout, SizeFacts } from "./sizing-model.js";

interface ResizeReadout {
  readonly selector: string;
  readonly width: number;
  readonly height: number;
}

interface FixedDrag {
  readonly axis: Axis;
  readonly edit: DirectEdit;
  readonly parent: ParentLayout;
  readonly facts: SizeFacts;
  readonly used: string;
}

interface DragStart {
  readonly value: number;
  readonly values: DirectEdit["values"];
  readonly x: number;
}

const SCRUB_PX_PER_STEP = 2;
const SHIFT_STEP = 10;
const ROUND_FACTOR = 10;
const AXES: readonly Axis[] = ["width", "height"];

const AXIS_SHORT: Record<Axis, string> = { height: "H", width: "W" };

const AXIS_NAME: Record<Axis, string> = { height: "Height", width: "Width" };

const toLiveFacts = (
  edit: DirectEdit,
  selection: SelectionContext
): SizeFacts => {
  const facts = toSizeFacts(selection.styles);
  const drafted = AXES.filter((axis) => edit.dirty.includes(axis));

  if (drafted.length === 0) {
    return facts;
  }

  return {
    ...facts,
    authored: {
      ...facts.authored,
      ...Object.fromEntries(
        drafted.map((axis) => [axis, edit.values[axis].trim()])
      ),
    },
  };
};

const toResizing = (
  live: ResizeReadout | null,
  selector: string
): ResizeReadout | null => {
  if (live?.selector === selector) {
    return live;
  }

  return null;
};

const toRoundedPx = (value: string): string => {
  const parsed = toParsedNumber(value);

  if (value.endsWith("px") && parsed) {
    return `${Math.round(parsed.value * ROUND_FACTOR) / ROUND_FACTOR}px`;
  }

  return value;
};

const toDragStart = (
  event: ReactPointerEvent<HTMLLabelElement>,
  fixed: FixedDrag
): DragStart => ({
  value: Math.round(toParsedNumber(fixed.used)?.value ?? 0),
  values: fixed.edit.values,
  x: event.clientX,
});

const toShiftScale = (isShift: boolean): number => {
  if (isShift) {
    return SHIFT_STEP;
  }

  return 1;
};

const toDragPatch = (
  fixed: FixedDrag,
  start: DragStart,
  event: PointerEvent
): ReturnType<typeof toSizePatch> => {
  const steps = Math.trunc((event.clientX - start.x) / SCRUB_PX_PER_STEP);
  const scale = toShiftScale(event.shiftKey);
  const next = Math.max(0, start.value + steps * scale);

  return toSizePatch(
    fixed.axis,
    "fixed",
    { parent: fixed.parent, usedPx: `${next}px`, values: start.values },
    fixed.facts
  );
};

const toDragSteps = (start: DragStart, event: PointerEvent): number =>
  Math.trunc((event.clientX - start.x) / SCRUB_PX_PER_STEP);

const toSizeDescription = (axis: Axis, label: string, px: string): string =>
  `${label}: ${px} now. Type or drag the label to set a fixed ${axis}.`;

export {
  AXIS_NAME,
  AXIS_SHORT,
  toDragPatch,
  toDragStart,
  toDragSteps,
  toLiveFacts,
  toResizing,
  toRoundedPx,
  toSizeDescription,
};

export type { DragStart, FixedDrag, ResizeReadout };
