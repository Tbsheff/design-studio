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
      "Set one style property of one layer in one state, such as hover or dark.",
  },
  confirm: "none",
  description:
    "Set one style property of one layer in one state: hover, focus-visible, active, disabled or dark. breakpoint is base (default) or a breakpoint name, so md with hover writes md:hover:. In a Tailwind page it writes the class with the state prefix. In a plain HTML page it writes or updates the declaration in a state rule of the page stylesheet. reset true removes the value in that state. Saves one version. Use set_forced_state and get_screenshot to see the state.",
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
