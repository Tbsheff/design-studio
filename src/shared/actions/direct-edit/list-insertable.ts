import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { DirectEditError } from "../_core/errors/direct-edit-error.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { ListInsertableSchema } from "./schema.js";

const listInsertableDirectEdit = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Insertable list of components from the project library, with the props and variants of each. Used by the Components panel and the insert tools.",
  errors: [BadRequest, NotFound, DirectEditError, DirectEditNotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/insert/components",
  },
  id: "direct-edit.listInsertable",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: ListInsertableSchema,
  scope: "project",
});

export { listInsertableDirectEdit };
