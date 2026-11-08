import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { ComponentPreviewFields } from "./payload/schema.js";
import { ComponentPreviewSchema } from "./schema.js";

const getComponentPreviewDirectEdit = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "component_preview",
    set: "kit",
    short:
      "Read only. Render one library component alone with default props, as an image.",
  },
  confirm: "none",
  description:
    "Read only. Render one React component of the project library alone with its default props, as in the tiles of the studio Components panel, and return the PNG. Required props get a value from the props type, variant props keep their default, and a compound component (Card, Alert) gets its parts. The page uses the app CSS from its dev server. Components that need data, server code or an open state are refused with the reason.",
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
    ...ComponentPreviewFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "component_preview" },
  needs: "project.read",
  output: ComponentPreviewSchema,
  scope: "project",
});

export { getComponentPreviewDirectEdit };
