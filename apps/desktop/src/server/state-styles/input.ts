import { BREAKPOINT_BASE } from "./deps.js";
import type { StateStyleInput, StyleState } from "./deps.js";

const LIST_STATE_STYLES_DESCRIPTION =
  "Read the state styles of one layer: hover, focus-visible, active, disabled, dark, the Radix data-state looks open, checked and selected, and the parent states group-hover, group-open and group-checked, at base and at each breakpoint. In a Tailwind page these are the classes with a state prefix (hover:bg-slate-900, group-data-[state=open]:rotate-180). In a plain HTML page these are its state rules. group is the nearest parent with the group class, or null. It also gives the state that each canvas frame shows from set_forced_state. Read only.";

const SET_STATE_STYLE_DESCRIPTION =
  "Set one style property of one layer in one state: hover, focus-visible, active, disabled, dark, open, checked, selected, group-hover, group-open or group-checked. breakpoint is base (default) or a breakpoint name, so md with open writes md:data-[state=open]:. Open writes data-[state=open]:, checked data-[state=checked]:, selected data-[state=active]:. The group states need a parent with the group class in the same file and write group-hover:, group-data-[state=open]: or group-data-[state=checked]: (group-hover/name: for group/name). reset true removes the value. Saves one version.";

const SET_FORCED_STATE_DESCRIPTION =
  "Show one canvas frame in a state without a real pointer, so get_screenshot with frameId shows it. hover, focus-visible, active or disabled applies the rules of that state to the layer (a CSS selector). open, checked and selected set data-state on the layer. group-hover, group-open and group-checked do this on the nearest parent with the group class. The old value comes back when the frame shows the default again. dark applies the dark rules (no layer needed). Pass state null to show the frame as it is. The source files do not change.";

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
