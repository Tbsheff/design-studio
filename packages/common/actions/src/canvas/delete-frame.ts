import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameNameSchema, FrameRemovedSchema } from "./frame/schema.js";

const deleteFrameCanvas = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "remove_frame",
    set: "core",
    short: "Remove one frame from the canvas. The page file stays.",
  },
  confirm: "user",
  description: "Remove one frame from the canvas. The page file stays.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "DELETE", path: "/api/projects/:projectId/canvas/frames" },
  id: "canvas.deleteFrame",
  input: Schema.Struct({
    frame: FrameNameSchema.annotate({ description: "Frame id or @label." }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: ["canvas.inspect"],
  mcp: { name: "remove_frame" },
  needs: "project.update",
  output: FrameRemovedSchema,
  scope: "project",
});

export { deleteFrameCanvas };
