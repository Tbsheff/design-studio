import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  MotionChangeSchema,
  MotionSpecSchema,
  MotionTargetFields,
} from "./schema.js";

const setMotion = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_motion",
    set: "core",
    short:
      "Set a transition or an entrance animation on one element, guarded by reduced motion.",
  },
  confirm: "none",
  description:
    "Set the motion of one element. kind transition takes properties, durationMs, easing, delayMs and state hover, focus or active with end values. kind entrance takes preset fade, slide-up, slide-down, scale-in or blur-in with durationMs, delayMs and staggerMs. kind none removes the motion. It writes Tailwind motion-safe classes, or keyframes and rules in a studio motion style block, guarded by prefers-reduced-motion. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/motion",
  },
  id: "motion.set",
  input: Schema.Struct({
    ...MotionTargetFields,
    spec: MotionSpecSchema,
    target: ElementTargetSchema,
  }),
  invalidates: ["motion.inspect"],
  mcp: { name: "set_motion" },
  needs: "project.update",
  output: MotionChangeSchema,
  scope: "project",
});

export { setMotion };
