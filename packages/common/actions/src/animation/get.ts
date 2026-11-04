import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { AnimationDetailSchema, AnimationRefFields } from "./schema.js";

const getAnimation = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "get_animation",
    set: "core",
    short:
      "Read one keyframe animation: tracks, keyframes, easing, trigger and loop.",
  },
  confirm: "none",
  description:
    "Read one saved keyframe animation with all its tracks, keyframes, easings, trigger and loop. Reads studio/animations only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/animation/:animationId",
  },
  id: "animation.get",
  input: Schema.Struct({
    ...AnimationRefFields,
  }),
  invalidates: [],
  mcp: { name: "get_animation" },
  needs: "project.read",
  output: AnimationDetailSchema,
  scope: "project",
});

export { getAnimation };
