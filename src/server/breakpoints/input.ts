import type { BreakpointStyleInput } from "./deps.js";

const LIST_BREAKPOINTS_DESCRIPTION =
  "Read the responsive breakpoints of the project (the Tailwind theme --breakpoint-* values, else sm 640, md 768, lg 1024 and xl 1280), the breakpoint that is active for a canvas frame width (frame id or label, or width in px), and, with targetSelector or targetSource, the style values that each breakpoint overrides on that layer: Tailwind classes with a md: or lg: prefix, or the declarations of its @media (min-width) rules in an HTML page. Read only.";

const SET_BREAKPOINT_STYLE_DESCRIPTION =
  'Set one style property of one layer at one breakpoint, like the breakpoint picker in Figma or Framer. breakpoint is "base" or a breakpoint name from list_breakpoints (md, lg). In a Tailwind page it writes the class with the breakpoint prefix (md:p-6) and replaces only the class for the same property at that prefix; base and other breakpoints stay as they are. In a plain HTML page it writes or updates the declaration in an @media (min-width) rule of the page stylesheet. reset: true removes the override at that breakpoint. One version and one undo step.';

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
  SET_BREAKPOINT_STYLE_DESCRIPTION,
  toStyleInput,
};
