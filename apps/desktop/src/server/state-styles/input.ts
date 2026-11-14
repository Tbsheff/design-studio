import { BREAKPOINT_BASE } from "./deps.js";
import type { StateStyleInput, StyleState } from "./deps.js";

const LIST_STATE_STYLES_DESCRIPTION =
  "Read the state styles of one layer: hover, focus-visible, active, disabled, dark, the Radix looks open, checked and selected, the parent states group-hover, group-open and group-checked, and the edge states first, last, odd and even, at base and at each breakpoint. In Tailwind these are state prefix classes (hover:bg-slate-900, last:border-0). In plain HTML these are its state rules. group is the nearest group parent or null. edge is list (a mapped list), siblings or null. It also gives the state of each frame from set_forced_state. Read only. limit caps the frame and state lists.";

const SET_STATE_STYLE_DESCRIPTION =
  "Set one style property of one layer in one state: hover, focus-visible, active, disabled, dark, open, checked, selected, group-hover, group-open, group-checked, first, last, odd or even. breakpoint is base (default) or a breakpoint name, so md with last writes md:last:. open writes data-[state=open]:, checked data-[state=checked]:, selected data-[state=active]:. The group states need a group parent and write group-hover: or group-data-[state=open]:. first, last, odd and even write first: to even: (:first-child to :nth-child(even) in HTML). reset true removes the value. Saves one version.";

const SET_FORCED_STATE_DESCRIPTION =
  "Show one canvas frame in a state without a real pointer, so get_screenshot with frameId shows it. hover, focus-visible, active or disabled applies the rules of that state to the layer (a CSS selector). open, checked and selected set data-state on the layer. group-hover, group-open and group-checked do this on the nearest group parent. first, last, odd and even are structural: nothing is forced and isStructural is true. dark applies the dark rules (no layer needed). Pass state null to show the frame as it is. The source files do not change.";

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
  LIST_STATE_STYLES_DESCRIPTION,
  SET_FORCED_STATE_DESCRIPTION,
  SET_STATE_STYLE_DESCRIPTION,
  toStateInput,
};
