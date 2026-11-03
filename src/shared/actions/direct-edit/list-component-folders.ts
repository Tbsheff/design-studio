import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { DirectEditError } from "../_core/errors/direct-edit-error.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { ComponentFolderListSchema } from "./schema.js";

const listComponentFoldersDirectEdit = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description: "List the folders where a new component can go.",
  errors: [BadRequest, NotFound, DirectEditError, DirectEditNotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/components/folders",
  },
  id: "direct-edit.listComponentFolders",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: ComponentFolderListSchema,
  scope: "project",
});

export { listComponentFoldersDirectEdit };
