import { z } from "zod";

import {
  BREAKPOINT_NAME,
  BREAKPOINT_VALUE_MAX,
  BREAKPOINT_WIDTH_MAX,
  DIRECT_STYLE_PROPERTIES,
} from "./deps.js";
import type { BreakpointStyleInput } from "./deps.js";

const FRAME_MAX = 200;

const LIST_BREAKPOINTS_DESCRIPTION =
  "Read the responsive breakpoints of the project (the Tailwind theme --breakpoint-* values, else sm 640, md 768, lg 1024 and xl 1280), the breakpoint that is active for a canvas frame width (frame id or label, or width in px), and, with targetSelector or targetSource, the style values that each breakpoint overrides on that layer: Tailwind classes with a md: or lg: prefix, or the declarations of its @media (min-width) rules in an HTML page. Read only.";

const SET_BREAKPOINT_STYLE_DESCRIPTION =
  'Set one style property of one layer at one breakpoint, like the breakpoint picker in Figma or Framer. breakpoint is "base" or a breakpoint name from list_breakpoints (md, lg). In a Tailwind page it writes the class with the breakpoint prefix (md:p-6) and replaces only the class for the same property at that prefix; base and other breakpoints stay as they are. In a plain HTML page it writes or updates the declaration in an @media (min-width) rule of the page stylesheet. reset: true removes the override at that breakpoint. One version and one undo step.';

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

const toStyleInput = (input: {
  breakpoint: string;
  property: string;
  reset?: boolean | undefined;
  value?: string | undefined;
}): BreakpointStyleInput => ({
  breakpoint: input.breakpoint,
  property: input.property,
  reset: input.reset ?? false,
  value: input.value ?? null,
});

export {
  LIST_BREAKPOINTS_DESCRIPTION,
  listBreakpointFields,
  SET_BREAKPOINT_STYLE_DESCRIPTION,
  setBreakpointFields,
  toStyleInput,
};
