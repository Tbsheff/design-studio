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
      "Set one style property of one layer in one state, such as hover, dark, open or group-hover.",
  },
  confirm: "none",
  description:
    "Set one style property of one layer in one state: hover, focus-visible, active, disabled, dark, open, checked, selected, group-hover, group-open, group-checked, first, last, odd or even. breakpoint is base (default) or a breakpoint name, so md with last writes md:last:. open writes data-[state=open]:, checked data-[state=checked]:, selected data-[state=active]:. The group states need a group parent and write group-hover: or group-data-[state=open]:. first, last, odd and even write first: to even: (:first-child to :nth-child(even) in HTML). reset true removes the value. Saves one version.",
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
