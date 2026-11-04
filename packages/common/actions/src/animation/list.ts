import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { AnimationSummarySchema, AnimationTargetFields } from "./schema.js";

const listAnimation = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "list_animation",
    set: "core",
    short:
      "List the keyframe animations of a direction with trigger, loop, duration and track count.",
  },
  confirm: "none",
  description:
    "List the keyframe animations saved in the project work tree: id, name, file, trigger, loop, duration and number of tracks. Reads studio/animations only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/animation",
  },
  id: "animation.list",
  input: Schema.Struct({
    ...PageFields,
    ...AnimationTargetFields,
  }),
  invalidates: [],
  mcp: { name: "list_animation" },
  needs: "project.read",
  output: pageOf(AnimationSummarySchema),
  scope: "project",
});

export { listAnimation };
