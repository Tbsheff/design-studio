import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import {
  AnimationExportFormatSchema,
  AnimationExportSchema,
  AnimationRefFields,
} from "./schema.js";

const exportAnimation = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "export_animation",
    set: "core",
    short:
      "Export a keyframe animation as CSS, React (Web Animations) or a webm video file.",
  },
  confirm: "none",
  description:
    "Export one saved keyframe animation. css: the @keyframes and rules as one stylesheet. react: a component that plays the same timeline with the Web Animations API. webm: a video of the timeline, captured from the page with a headless browser and ffmpeg; fails with Unavailable when the browser or ffmpeg is missing. Changes no design file.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/animation/:animationId/export",
  },
  id: "animation.export",
  input: Schema.Struct({
    ...AnimationRefFields,
    format: AnimationExportFormatSchema,
  }),
  invalidates: ["animation.list"],
  mcp: { name: "export_animation" },
  needs: "project.read",
  output: AnimationExportSchema,
  scope: "project",
});

export { exportAnimation };
