import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  FrameDirectionField,
  FramePointFields,
  FramePointedSchema,
} from "./frame/schema.js";

const setPointCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "canvas_point",
    set: "core",
    short:
      "Point the user canvas at one frame, and an optional CSS selector, at the end of a reply.",
  },
  confirm: "none",
  description:
    "Show the user a small badge on the canvas that says you are pointing at one frame (and an optional CSS selector). The view moves only when the user clicks Show, so the result always has shown: false. badge: true means a studio window has the project open and the user sees the badge.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/canvas/point" },
  id: "canvas.setPoint",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    ...FrameDirectionField,
    ...FramePointFields,
  }),
  invalidates: ["canvas.inspect"],
  mcp: { name: "canvas_point" },
  needs: "project.update",
  output: FramePointedSchema,
  scope: "project",
});

export { setPointCanvas };
