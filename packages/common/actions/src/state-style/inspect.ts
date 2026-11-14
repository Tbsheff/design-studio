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
      "Read the layer, Radix and parent (group) state styles of one layer, such as hover, open or group-hover.",
  },
  confirm: "none",
  description:
    "Read the state styles of one layer: hover, focus-visible, active, disabled, dark, the Radix data-state looks open, checked and selected, and the parent states group-hover, group-open and group-checked, at base and at each breakpoint. In a Tailwind page these are the classes with a state prefix (hover:bg-slate-900, group-data-[state=open]:rotate-180). In a plain HTML page these are its state rules. group is the nearest parent with the group class, or null. It also gives the state that each canvas frame shows from set_forced_state. Read only. limit caps the frame and state lists.",
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
