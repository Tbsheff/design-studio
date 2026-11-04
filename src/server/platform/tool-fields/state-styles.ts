import { z } from "zod";

import {
  BREAKPOINT_NAME,
  BREAKPOINT_VALUE_MAX,
} from "../../../shared/breakpoints.js";
import { DIRECT_STYLE_PROPERTIES } from "../../../shared/contracts.js";
import {
  STATE_SELECTOR_MAX,
  STYLE_STATES,
} from "../../../shared/state-styles.js";

const FRAME_MAX = 60;

const stateField = z
  .enum(STYLE_STATES)
  .describe("hover, focus-visible, active, disabled or dark.");

const setStateFields = {
  breakpoint: z
    .string()
    .trim()
    .regex(BREAKPOINT_NAME)
    .optional()
    .describe('"base" (default) or a breakpoint name, for example "md".'),
  property: z
    .enum(DIRECT_STYLE_PROPERTIES)
    .describe("CSS property, for example background-color or color."),
  reset: z
    .boolean()
    .optional()
    .describe("Remove the value in this state. Default false."),
  state: stateField,
  value: z
    .string()
    .trim()
    .min(1)
    .max(BREAKPOINT_VALUE_MAX)
    .optional()
    .describe('CSS value, for example "#0f172a" or "0.9".'),
};

const forcedStateFields = {
  frameId: z
    .string()
    .trim()
    .min(1)
    .max(FRAME_MAX)
    .describe("Canvas frame id or @label from canvas_list."),
  layer: z
    .string()
    .trim()
    .min(1)
    .max(STATE_SELECTOR_MAX)
    .nullable()
    .optional()
    .describe("CSS selector of the layer. null or leave out for dark."),
  state: stateField
    .nullable()
    .describe("The state to show, or null to show the frame as it is."),
};

export { forcedStateFields, setStateFields };
