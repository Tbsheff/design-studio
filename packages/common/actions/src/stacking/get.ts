import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementSourceFields } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  StackingBreakpointDefaultSchema,
  StackingInfoSchema,
  StackingTargetFields,
} from "./schema.js";

const getStacking = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_stacking",
    set: "core",
    short: "Read the position, offsets, overflow and z-index of one layer.",
  },
  confirm: "none",
  description:
    "Read the scroll and stacking values of one layer: position, the top, right, bottom and left offsets, overflow-x, overflow-y and z-index. Each value tells its source: a Tailwind class with its scale or token key, a project token, an arbitrary value or a CSS declaration. breakpoint is base (default) or a breakpoint name. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/stacking",
  },
  id: "stacking.get",
  input: Schema.Struct({
    ...StackingTargetFields,
    ...ElementSourceFields,
    breakpoint: StackingBreakpointDefaultSchema,
  }),
  invalidates: [],
  mcp: { name: "get_stacking" },
  needs: "project.read",
  output: StackingInfoSchema,
  scope: "project",
});

export { getStacking };
