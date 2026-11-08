import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ImpactGetFields, ImpactResultSchema } from "./schema.js";

const getImpact = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_impact",
    set: "app",
    short:
      "Read the last result of run_impact: routes, changed pixel share and diff pictures.",
  },
  confirm: "none",
  description:
    "Read the last result of run_impact for a project direction. It shows the phase of the last run, the file, and for each route the share of changed pixels with before, after and diff pictures. Run run_impact first. It returns an empty list when no run is saved.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/impact" },
  id: "impact.get",
  input: Schema.Struct({
    ...ImpactGetFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "get_impact" },
  needs: "project.read",
  output: ImpactResultSchema,
  scope: "project",
});

export { getImpact };
