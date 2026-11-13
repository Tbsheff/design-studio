import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameDeleteListSchema, FramesRemovedSchema } from "./frame/schema.js";

const deleteFramesCanvas = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_frames_canvas",
    set: "core",
    short:
      "Remove several frames from the canvas in one step. The page files stay.",
  },
  confirm: "user",
  description:
    "Remove several frames from the canvas in one step. The page files stay. One undo brings all of them back. The canvas keeps at least one frame.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/canvas/frames/delete",
  },
  id: "canvas.deleteFrames",
  input: Schema.Struct({
    frames: FrameDeleteListSchema.annotate({
      description: "1 to 50 frame ids or @labels from canvas_list.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: ["canvas.getDoc", "canvas.inspect", "canvas.listLinks"],
  mcp: { name: "delete_frames_canvas" },
  needs: "project.update",
  output: FramesRemovedSchema,
  scope: "project",
});

export { deleteFramesCanvas };
