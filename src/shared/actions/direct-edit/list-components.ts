import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { DirectEditError } from "../_core/errors/direct-edit-error.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { ComponentListSchema } from "./schema.js";

const listComponentsDirectEdit = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "List the components of a direction with their file, name and usage count.",
  errors: [BadRequest, NotFound, DirectEditError, DirectEditNotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/components",
  },
  id: "direct-edit.listComponents",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: ComponentListSchema,
  scope: "project",
});

export { listComponentsDirectEdit };
