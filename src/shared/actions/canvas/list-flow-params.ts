import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FlowParamsListSchema } from "./schema.js";

const listFlowParamsCanvas = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read the sample values saved for the dynamic segments of app routes, for example slug and patientId. Flow uses them to make concrete paths.",
  errors: [BadRequest, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/flow/params" },
  id: "canvas.listFlowParams",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: FlowParamsListSchema,
  scope: "project",
});

export { listFlowParamsCanvas };
