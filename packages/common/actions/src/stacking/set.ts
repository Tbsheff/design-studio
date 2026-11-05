import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  StackingChangeFields,
  StackingChangeSchema,
  StackingTargetFields,
} from "./schema.js";

const setStacking = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_stacking",
    set: "core",
    short:
      "Set position, offsets, overflow or z-index on one layer; null removes a value.",
  },
  confirm: "none",
  description:
    "Set the scroll and stacking values of one layer in one version: position, top, right, bottom, left, overflow, overflowX, overflowY and zIndex. Pass only the values to change; null removes a value. In a Tailwind page it writes classes such as sticky top-0 z-10 and overflow-y-auto. In a plain page it writes CSS declarations. zIndex takes an integer, auto or a project token. breakpoint is base (default) or a breakpoint name. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/stacking",
  },
  id: "stacking.set",
  input: Schema.Struct({
    ...StackingTargetFields,
    ...StackingChangeFields,
    target: ElementTargetSchema,
  }),
  invalidates: ["stacking.get"],
  mcp: { name: "set_stacking" },
  needs: "project.update",
  output: StackingChangeSchema,
  scope: "project",
});

export { setStacking };
