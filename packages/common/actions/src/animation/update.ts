import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  AnimationChangeSchema,
  AnimationDurationSchema,
  AnimationLoopSchema,
  AnimationNameSchema,
  AnimationRefFields,
  AnimationTracksSchema,
  AnimationTriggerSchema,
} from "./schema.js";

const updateAnimation = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "update_animation",
    set: "core",
    short:
      "Replace the tracks, keyframes, trigger, loop or name of a saved animation and rewrite its CSS.",
  },
  confirm: "none",
  description:
    "Update one saved keyframe animation. Send only the fields to change: name, trigger, loop, duration or the full tracks list (tracks replace the old list, with their keyframes). Rewrites the CSS block in the project and the timeline file. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/animation/:animationId",
  },
  id: "animation.update",
  input: Schema.Struct({
    ...AnimationRefFields,
    durationMs: Schema.optionalKey(AnimationDurationSchema),
    loop: Schema.optionalKey(AnimationLoopSchema),
    name: Schema.optionalKey(AnimationNameSchema),
    tracks: Schema.optionalKey(AnimationTracksSchema),
    trigger: Schema.optionalKey(AnimationTriggerSchema),
  }),
  invalidates: ["animation.list", "animation.get"],
  mcp: { name: "update_animation" },
  needs: "project.update",
  output: AnimationChangeSchema,
  scope: "project",
});

export { updateAnimation };
