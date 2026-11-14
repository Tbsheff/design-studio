import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  StateStyleChangeFields,
  StateStyleChangeSchema,
  StateStyleTargetFields,
} from "./schema.js";

const setStateStyle = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_state_style",
    set: "core",
    short:
      "Set one style property of one layer in one state, such as hover, dark or open.",
  },
  confirm: "none",
  description:
    'Set one style property of one layer in one state: hover, focus-visible, active, disabled, dark, open, checked or selected. breakpoint is base (default) or a breakpoint name, so md with open writes md:data-[state=open]:. Open writes data-[state=open]:, checked data-[state=checked]: and selected data-[state=active]: (or data-[state=selected]: when the layer uses it). In a plain HTML page it writes the declaration in a state rule, such as [data-state="open"]. reset true removes the value. Saves one version. Use set_forced_state and get_screenshot to see it.',
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/state-styles",
  },
  id: "state-style.set",
  input: Schema.Struct({
    ...StateStyleTargetFields,
    ...StateStyleChangeFields,
    target: ElementTargetSchema,
  }),
  invalidates: ["state-style.inspect"],
  mcp: { name: "set_state_style" },
  needs: "project.update",
  output: StateStyleChangeSchema,
  scope: "project",
});

export { setStateStyle };
