import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { ComponentPreviewSchema } from "./schema.js";

const getComponentPreviewDirectEdit = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Render one library component alone with default props. Returns the PNG as base64 with the props and text used.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/component-preview",
  },
  id: "direct-edit.getComponentPreview",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    file: Schema.optionalKey(Schema.String),
    id: Schema.optionalKey(Schema.String),
    name: Schema.optionalKey(Schema.String),
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: ComponentPreviewSchema,
  scope: "project",
});

export { getComponentPreviewDirectEdit };
