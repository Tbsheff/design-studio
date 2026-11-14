import { BREAKPOINT_BASE } from "./deps.js";
import type { StateStyleInput, StyleState } from "./deps.js";

const LIST_STATE_STYLES_DESCRIPTION =
  "Read the state styles of one layer at base and at each breakpoint: hover, focus-visible, active, disabled, dark, the Radix states open, closed, checked, on, selected, active-item and invalid, the parent states group-hover, group-open and group-checked, and first, last, odd and even. In Tailwind these are state prefix classes (hover:bg-slate-900). In plain HTML these are its state rules. other lists the data- and aria- prefixes it cannot edit (data-[side=top]). group is the nearest group parent or null. edge is list, siblings or null. It also gives the forced state of each frame. Read only.";

const SET_STATE_STYLE_DESCRIPTION =
  "Set one style property of one layer in one state (list_state_styles lists them). breakpoint is base (default) or a breakpoint name: md with last writes md:last:. open, closed, checked and on write data-[state=open]: and so on, selected data-[state=active]:, active-item data-[active=true]:, invalid aria-invalid:. disabled writes data-[disabled]: when the layer has it, else disabled:. The group states need a group parent and write group-hover: or group-data-[state=open]:. first to even write first: to even: (:first-child in HTML). reset true removes the value. Saves one version.";

const SET_FORCED_STATE_DESCRIPTION =
  "Show one canvas frame in a state without a real pointer, so get_screenshot with frameId shows it. hover, focus-visible, active or disabled applies the rules of that state to the layer (a CSS selector). open, closed, checked, on and selected set data-state on the layer, active-item sets data-active and invalid sets aria-invalid. group-hover, group-open and group-checked do this on the nearest parent with the group class. The old value comes back after. dark applies the dark rules (no layer needed). Pass state null to show the frame as it is. The source files do not change.";

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
