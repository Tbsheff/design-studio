import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementSourceFields } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  StateStyleInfoSchema,
  StateStyleLimitSchema,
  StateStyleTargetFields,
} from "./schema.js";

const inspectStateStyle = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_state_styles",
    set: "core",
    short:
      "Read the hover, focus, active, disabled and dark state styles of one layer.",
  },
  confirm: "none",
  description:
    "Read the interaction and theme state styles of one layer: the values it sets for hover, focus-visible, active, disabled and dark, at base and at each breakpoint. In a Tailwind page these are the classes with a state prefix. In a plain HTML page these are the declarations of its state rules and of its dark rules. It also gives the state that each canvas frame shows from set_forced_state. Read only. The limit caps the list of forced frames and the state names.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/state-styles",
  },
  id: "state-style.inspect",
  input: Schema.Struct({
    ...StateStyleTargetFields,
    ...ElementSourceFields,
    limit: StateStyleLimitSchema,
  }),
  invalidates: [],
  mcp: { name: "list_state_styles" },
  needs: "project.read",
  output: StateStyleInfoSchema,
  scope: "project",
});

export { inspectStateStyle };
