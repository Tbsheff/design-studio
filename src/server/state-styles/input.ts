import { z } from "zod";

import {
  BREAKPOINT_BASE,
  BREAKPOINT_NAME,
  BREAKPOINT_VALUE_MAX,
  DIRECT_STYLE_PROPERTIES,
  STATE_SELECTOR_MAX,
  STYLE_STATES,
} from "./deps.js";
import type { StateStyleInput, StyleState } from "./deps.js";

const FRAME_MAX = 60;

const LIST_STATE_STYLES_DESCRIPTION =
  "Read the interaction and theme state styles of one layer: the values it sets for hover, focus-visible, active, disabled and dark, at base and at each breakpoint (md:hover:). In a Tailwind page these are the classes with a state prefix (hover:bg-slate-900, md:dark:text-white). In a plain HTML page these are the declarations of its :hover, :focus-visible, :active and :disabled rules and of its dark rules in the page stylesheet. It also gives the state that each canvas frame shows from set_forced_state. Read only.";

const SET_STATE_STYLE_DESCRIPTION =
  'Set one style property of one layer in one state: hover, focus-visible, active, disabled or dark. breakpoint is "base" (default) or a breakpoint name from list_breakpoints, so md with hover writes md:hover:. In a Tailwind page it writes the class with the state prefix (hover:bg-slate-900) and replaces only the class for the same property at that prefix. In a plain HTML page it writes or updates the declaration in a :hover, :focus-visible, :active, :disabled or dark rule of the page stylesheet. reset: true removes the value in that state. One version and one undo step. Use set_forced_state and get_screenshot to see the state.';

const SET_FORCED_STATE_DESCRIPTION =
  "Show one canvas frame in a state without a real pointer, so get_screenshot with frameId shows it. state hover, focus-visible, active or disabled applies the rules of that state to the layer (a CSS selector); dark puts the dark class on the page root and applies the dark rules (layer is not needed). Pass state null to show the frame as it is. The source files do not change.";

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

const toStateInput = (input: {
  breakpoint?: string | undefined;
  property: string;
  reset?: boolean | undefined;
  state: StyleState;
  value?: string | undefined;
}): StateStyleInput => ({
  breakpoint: input.breakpoint ?? BREAKPOINT_BASE,
  property: input.property,
  reset: input.reset ?? false,
  state: input.state,
  value: input.value ?? null,
});

export {
  forcedStateFields,
  LIST_STATE_STYLES_DESCRIPTION,
  SET_FORCED_STATE_DESCRIPTION,
  SET_STATE_STYLE_DESCRIPTION,
  setStateFields,
  toStateInput,
};
