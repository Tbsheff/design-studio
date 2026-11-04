import { z } from "zod";

import { BREAKPOINT_NAME } from "../../../shared/breakpoints.js";
import {
  STACKING_OVERFLOWS,
  STACKING_POSITIONS,
  STACKING_VALUE_MAX,
} from "../../../shared/stacking.js";

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

export { getStackingFields, setStackingFields };
