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
    "Set one style property of one layer in one state: hover, focus-visible, active, disabled, dark, open, checked, selected, group-hover, group-open or group-checked. breakpoint is base (default) or a breakpoint name, so md with open writes md:data-[state=open]:. Open writes data-[state=open]:, checked data-[state=checked]:, selected data-[state=active]:. The group states need a parent with the group class in the same file and write group-hover:, group-data-[state=open]: or group-data-[state=checked]: (group-hover/name: for group/name). reset true removes the value. Saves one version.",
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
