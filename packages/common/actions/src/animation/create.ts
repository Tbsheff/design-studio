import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  AnimationChangeSchema,
  AnimationDurationSchema,
  AnimationFileFieldSchema,
  AnimationLoopFieldSchema,
  AnimationNameSchema,
  AnimationTargetFields,
  AnimationTracksSchema,
  AnimationTriggerSchema,
} from "./schema.js";

const createAnimation = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "create_animation",
    set: "core",
    short:
      "Create a keyframe timeline: tracks by layer, keyframes by property and time, easing, trigger and loop. Writes CSS to the project.",
  },
  confirm: "none",
  description:
    "Create a named keyframe animation. A track names a layer by CSS selector and holds keyframes by property and time, with an easing per segment. A trigger starts it: load, hover, click, in-view or scroll. Writes @keyframes, the animation rules (scroll and in-view use animation-timeline) and a prefers-reduced-motion block into the page style block or the app CSS file, and the timeline into studio/animations. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/animation",
  },
  id: "animation.create",
  input: Schema.Struct({
    ...AnimationTargetFields,
    durationMs: AnimationDurationSchema,
    file: AnimationFileFieldSchema,
    loop: AnimationLoopFieldSchema,
    name: AnimationNameSchema,
    tracks: AnimationTracksSchema,
    trigger: AnimationTriggerSchema,
  }),
  invalidates: ["animation.list", "animation.get"],
  mcp: { name: "create_animation" },
  needs: "project.update",
  output: AnimationChangeSchema,
  scope: "project",
});

export { createAnimation };
