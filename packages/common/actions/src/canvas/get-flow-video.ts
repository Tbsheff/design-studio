import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FlowVideoFileSchema, FlowVideoNameSchema } from "./schema.js";

const getFlowVideoCanvas = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read one prototype video file that export_flow_canvas wrote. Returns the file as base64 text with its name and media type. The studio uses this to download the video.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/flow/video" },
  id: "canvas.getFlowVideo",
  input: Schema.Struct({
    file: FlowVideoNameSchema.annotate({
      description: "File name from the path that export_flow_canvas returned.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: FlowVideoFileSchema,
  scope: "project",
});

export { getFlowVideoCanvas };
