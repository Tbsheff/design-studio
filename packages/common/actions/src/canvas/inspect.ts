import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { CanvasListedSchema, FrameDirectionField } from "./frame/schema.js";

const inspectCanvas = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "canvas_list",
    set: "core",
    short:
      "Read only. List the frames on the studio canvas with id, label, page, size, position, the user selection and the live frame.",
  },
  confirm: "none",
  description:
    "List the frames on the studio canvas of a project: id, label, page, size and position, plus what the user has selected and which frame is live.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/canvas/frames" },
  id: "canvas.inspect",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    ...FrameDirectionField,
  }),
  invalidates: [],
  mcp: { name: "canvas_list" },
  needs: "project.read",
  output: CanvasListedSchema,
  scope: "project",
});

export { inspectCanvas };
