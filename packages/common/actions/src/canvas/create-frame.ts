import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  FrameAddFields,
  FrameDirectionField,
  FramesPlacedSchema,
} from "./frame/schema.js";

const createFrameCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "add_frame",
    set: "core",
    short:
      "Add a frame for a page or a state (path and viewport) to the right of all frames, or beside another frame.",
  },
  confirm: "none",
  description:
    "Add a frame for a page or a state (path + viewport) to the canvas, to the right of all frames unless you pass rightOf or below.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/canvas/frames" },
  id: "canvas.createFrame",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    ...FrameDirectionField,
    ...FrameAddFields,
  }),
  invalidates: ["canvas.inspect"],
  mcp: { name: "add_frame" },
  needs: "project.update",
  output: FramesPlacedSchema,
  scope: "project",
});

export { createFrameCanvas };
