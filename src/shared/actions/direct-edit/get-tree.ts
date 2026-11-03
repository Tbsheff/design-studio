import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { WorkTreeSchema } from "./schema.js";

const getTreeDirectEdit = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description: "List the files in the work tree of a direction.",
  errors: [BadRequest, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/d/:directionId/tree" },
  id: "direct-edit.getTree",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: WorkTreeSchema,
  scope: "project",
});

export { getTreeDirectEdit };
