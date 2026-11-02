import { z } from "zod";

import {
  BREAKPOINT_BASE,
  BREAKPOINT_NAME,
  STACKING_OVERFLOWS,
  STACKING_POSITIONS,
  STACKING_VALUE_MAX,
} from "./deps.js";
import type { StackingChanges, StackingInput } from "./deps.js";

interface StackingFieldsInput {
  readonly bottom?: string | null | undefined;
  readonly breakpoint?: string | undefined;
  readonly left?: string | null | undefined;
  readonly overflow?: string | null | undefined;
  readonly overflowX?: string | null | undefined;
  readonly overflowY?: string | null | undefined;
  readonly position?: string | null | undefined;
  readonly right?: string | null | undefined;
  readonly top?: string | null | undefined;
  readonly zIndex?: string | null | undefined;
}

const GET_STACKING_DESCRIPTION =
  'Read the scroll and stacking values of one layer: position (static, relative, sticky, fixed or absolute), the top, right, bottom and left offsets, overflow-x and overflow-y (visible, hidden, auto, scroll or clip) and z-index. Each value tells its source: a Tailwind class (sticky, top-0, overflow-y-auto, z-10) with its scale or token key, a project token (var(--z-header)), an arbitrary value or a CSS declaration. breakpoint is "base" (default) or a breakpoint name from list_breakpoints. Read only.';

const SET_STACKING_DESCRIPTION =
  'Set the scroll and stacking values of one layer in one version: position, top, right, bottom, left, overflow, overflowX, overflowY and zIndex. Pass only the values to change; null removes a value. In a Tailwind page it writes the classes (sticky top-0 z-10, overflow-y-auto) and replaces the classes for the same property. In a plain page it writes CSS declarations. An offset takes a spacing key (0, 4, px, full) or a CSS length (16px). zIndex takes an integer, auto (z-0 to z-50 is the Tailwind scale) or a project token (--z-header). breakpoint is "base" (default) or a breakpoint name, for example md. One version and one undo step.';

const offset = z
  .string()
  .trim()
  .min(1)
  .max(STACKING_VALUE_MAX)
  .nullable()
  .optional();

const overflow = z.enum(STACKING_OVERFLOWS).nullable().optional();

const breakpointField = z
  .string()
  .trim()
  .regex(BREAKPOINT_NAME)
  .optional()
  .describe('"base" (default) or a breakpoint name, for example "md".');

const getStackingFields = { breakpoint: breakpointField };

const setStackingFields = {
  bottom: offset.describe(
    "Bottom offset, for example 0 or 16px. null removes it."
  ),
  breakpoint: breakpointField,
  left: offset.describe("Left offset, for example 0 or 16px. null removes it."),
  overflow: overflow.describe("Overflow for both axes. null removes it."),
  overflowX: overflow.describe("Overflow on the x axis. null removes it."),
  overflowY: overflow.describe(
    "Overflow on the y axis, for example auto. null removes it."
  ),
  position: z
    .enum(STACKING_POSITIONS)
    .nullable()
    .optional()
    .describe("Position, for example sticky. null removes it."),
  right: offset.describe(
    "Right offset, for example 0 or 16px. null removes it."
  ),
  top: offset.describe("Top offset, for example 0 or 16px. null removes it."),
  zIndex: z
    .string()
    .trim()
    .min(1)
    .max(STACKING_VALUE_MAX)
    .nullable()
    .optional()
    .describe(
      'z-index: an integer, "auto" or a project token like "--z-header". null removes it.'
    ),
};

const FIELD_PROPS = [
  ["position", "position"],
  ["top", "top"],
  ["right", "right"],
  ["bottom", "bottom"],
  ["left", "left"],
  ["overflow", "overflow-x"],
  ["overflow", "overflow-y"],
  ["overflowX", "overflow-x"],
  ["overflowY", "overflow-y"],
  ["zIndex", "z-index"],
] as const;

const changesOf = (input: StackingFieldsInput): StackingChanges => {
  const changes: Record<string, string | null> = {};

  for (const [field, prop] of FIELD_PROPS) {
    if (field in input) {
      changes[prop] = input[field] ?? null;
    }
  }

  return changes;
};

const toStackingInput = (input: StackingFieldsInput): StackingInput | null => {
  const changes = changesOf(input);

  if (Object.keys(changes).length === 0) {
    return null;
  }

  return { breakpoint: input.breakpoint ?? BREAKPOINT_BASE, changes };
};

export {
  GET_STACKING_DESCRIPTION,
  getStackingFields,
  SET_STACKING_DESCRIPTION,
  setStackingFields,
  toStackingInput,
};

export type { StackingFieldsInput };
