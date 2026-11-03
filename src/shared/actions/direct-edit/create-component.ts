import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { DirectEditError } from "../_core/errors/direct-edit-error.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { CreateComponentResultSchema } from "./schema.js";

const createComponentDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Extract the selected elements into a new component file. Replaces them with one use and saves one version.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditError,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/components/create",
  },
  id: "direct-edit.createComponent",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    folder: Schema.optionalKey(Schema.Unknown),
    name: Schema.optionalKey(Schema.Unknown),
    projectId: ProjectIdSchema,
    targets: Schema.Unknown,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: CreateComponentResultSchema,
  scope: "project",
});

export { createComponentDirectEdit };
