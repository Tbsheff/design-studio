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
    "Read the state styles of one layer at base and at each breakpoint: hover, focus-visible, active, disabled, dark, the Radix states open, closed, checked, on, selected, active-item and invalid, the parent states group-hover, group-open and group-checked, and first, last, odd and even. In Tailwind these are state prefix classes (hover:bg-slate-900). In plain HTML these are its state rules. other lists the data- and aria- prefixes it cannot edit (data-[side=top]). group is the nearest group parent or null. edge is list, siblings or null. It also gives the forced state of each frame. Read only.",
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
