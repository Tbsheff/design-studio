import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  StateStyleForcedChangeSchema,
  StateStyleForcedFields,
  StateStyleTargetFields,
} from "./schema.js";

const setForcedStateStyle = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_forced_state",
    set: "core",
    short:
      "Show one canvas frame in a state without a real pointer, so get_screenshot with frameId shows it. hover, focus-visible, active or disabled applies the rules of that state to the layer (a CSS selector). open, checked and selected set data-state on the layer. group-hover, group-open and group-checked do this on the nearest group parent. first, last, odd and even are structural: nothing is forced and isStructural is true. dark applies the dark rules (no layer needed). Pass state null to show the frame as it is. The source files do not change.",
  },
  confirm: "none",
  description:
    "Show one canvas frame in a state without a real pointer, so get_screenshot with frameId shows it. hover, focus-visible, active or disabled applies the rules of that state to the layer (a CSS selector). open, closed, checked, on and selected set data-state on the layer, active-item sets data-active and invalid sets aria-invalid. group-hover, group-open and group-checked do this on the nearest parent with the group class. The old value comes back after. dark applies the dark rules (no layer needed). Pass state null to show the frame as it is. The source files do not change.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/state-styles/forced",
  },
  id: "state-style.setForced",
  input: Schema.Struct({
    ...StateStyleTargetFields,
    ...StateStyleForcedFields,
  }),
  invalidates: ["state-style.inspect"],
  mcp: { name: "set_forced_state" },
  needs: "project.update",
  output: StateStyleForcedChangeSchema,
  scope: "project",
});

export { setForcedStateStyle };
