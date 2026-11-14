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
      "Set one style property of one layer in one state, such as hover, dark, open, on, invalid or group-hover.",
  },
  confirm: "none",
  description:
    "Set one style property of one layer in one state (list_state_styles lists them). breakpoint is base (default) or a breakpoint name: md with last writes md:last:. open, closed, checked and on write data-[state=open]: and so on, selected data-[state=active]:, active-item data-[active=true]:, invalid aria-invalid:. disabled writes data-[disabled]: when the layer has it, else disabled:. The group states need a group parent and write group-hover: or group-data-[state=open]:. first to even write first: to even: (:first-child in HTML). reset true removes the value. Saves one version.",
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
