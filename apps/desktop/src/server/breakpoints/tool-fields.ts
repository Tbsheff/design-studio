import {
  BREAKPOINT_NAME,
  BREAKPOINT_VALUE_MAX,
  BREAKPOINT_WIDTH_MAX,
  DIRECT_STYLE_PROPERTIES,
  z,
} from "./deps.js";

const FRAME_MAX = 200;

const listBreakpointFields = {
  frame: z
    .string()
    .trim()
    .min(1)
    .max(FRAME_MAX)
    .optional()
    .describe(
      "Canvas frame id or label. Its width picks the active breakpoint."
    ),
  width: z
    .number()
    .int()
    .min(1)
    .max(BREAKPOINT_WIDTH_MAX)
    .optional()
    .describe("Or a frame width in px, for example 390 or 1440."),
};

const setBreakpointFields = {
  breakpoint: z
    .string()
    .trim()
    .regex(BREAKPOINT_NAME)
    .describe('"base" or a breakpoint name, for example "md" or "lg".'),
  property: z
    .enum(DIRECT_STYLE_PROPERTIES)
    .describe("CSS property, for example padding-top, font-size or display."),
  reset: z
    .boolean()
    .optional()
    .describe("Remove the value at this breakpoint. Default false."),
  value: z
    .string()
    .trim()
    .min(1)
    .max(BREAKPOINT_VALUE_MAX)
    .optional()
    .describe('CSS value, for example "24px", "1.25rem", "none" or "#0f172a".'),
};

export { listBreakpointFields, setBreakpointFields };
