import { BREAKPOINT_BASE } from "./deps.js";
import type { StateStyleInput, StyleState } from "./deps.js";

const LIST_STATE_STYLES_DESCRIPTION =
  'Read the interaction and theme state styles of one layer: hover, focus-visible, active, disabled, dark, and the Radix data-state looks open, checked and selected, at base and at each breakpoint. In a Tailwind page these are the classes with a state prefix (hover:bg-slate-900, data-[state=open]:bg-slate-100). In a plain HTML page these are the declarations of its state rules ([data-state="open"] for the Radix states). It also gives the state that each canvas frame shows from set_forced_state. Read only.';

const SET_STATE_STYLE_DESCRIPTION =
  'Set one style property of one layer in one state: hover, focus-visible, active, disabled, dark, open, checked or selected. breakpoint is base (default) or a breakpoint name, so md with open writes md:data-[state=open]:. Open writes data-[state=open]:, checked data-[state=checked]: and selected data-[state=active]: (or data-[state=selected]: when the layer uses it). In a plain HTML page it writes the declaration in a state rule, such as [data-state="open"]. reset true removes the value. Saves one version. Use set_forced_state and get_screenshot to see it.';

const SET_FORCED_STATE_DESCRIPTION =
  "Show one canvas frame in a state without a real pointer, so get_screenshot with frameId shows it. hover, focus-visible, active or disabled applies the rules of that state to the layer (a CSS selector). open, checked and selected set data-state to open, checked or active on the layer, and put the old value back when the frame shows the default again. A Radix part that renders again can set its own value back. dark applies the dark rules (no layer needed). Pass state null to show the frame as it is. The source files do not change.";

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
