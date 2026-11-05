import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  StateStyleForcedFields,
  StateStyleForcedSchema,
  StateStyleTargetFields,
} from "./schema.js";

const setForcedStateStyle = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_forced_state",
    set: "core",
    short:
      "Show one canvas frame in a state without a pointer. Source files stay the same.",
  },
  confirm: "none",
  description:
    "Show one canvas frame in a state without a real pointer, so get_screenshot with frameId shows it. state hover, focus-visible, active or disabled applies the rules of that state to the layer, a CSS selector. dark puts the dark class on the page root and applies the dark rules; layer is not needed. Pass state null to show the frame as it is. The source files do not change.",
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
  output: StateStyleForcedSchema,
  scope: "project",
});

export { setForcedStateStyle };
