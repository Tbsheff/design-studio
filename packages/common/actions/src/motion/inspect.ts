import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementSourceFields } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields } from "../_core/list-page.js";
import { MotionInfoSchema, MotionTargetFields } from "./schema.js";

const inspectMotion = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_motion",
    set: "core",
    short: "Read the transitions and entrance animations of one element.",
  },
  confirm: "none",
  description:
    "Read the motion of one element: the Tailwind transition, duration, ease, delay and animate classes, the studio motion CSS rules for the element, and whether a prefers-reduced-motion guard is there. Read only. The limit caps each list in the result.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/motion",
  },
  id: "motion.inspect",
  input: Schema.Struct({
    ...MotionTargetFields,
    ...ElementSourceFields,
    limit: PageFields.limit,
  }),
  invalidates: [],
  mcp: { name: "list_motion" },
  needs: "project.read",
  output: MotionInfoSchema,
  scope: "project",
});

export { inspectMotion };
