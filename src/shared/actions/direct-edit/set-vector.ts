import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { DirectEditError } from "../_core/errors/direct-edit-error.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { InsertResultSchema } from "./schema.js";

const setVectorDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Insert a vector shape or path, run a boolean on two shapes, or paint a shape. Saves one version.",
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
    path: "/api/projects/:projectId/d/:directionId/vector",
  },
  id: "direct-edit.setVector",
  input: Schema.Struct({
    boolean: Schema.optionalKey(Schema.Unknown),
    box: Schema.optionalKey(Schema.Unknown),
    d: Schema.optionalKey(Schema.Unknown),
    directionId: DirectionIdSchema,
    fill: Schema.optionalKey(Schema.Unknown),
    name: Schema.optionalKey(Schema.Unknown),
    op: Schema.optionalKey(Schema.Unknown),
    page: Schema.optionalKey(Schema.Unknown),
    projectId: ProjectIdSchema,
    rects: Schema.optionalKey(Schema.Unknown),
    relativeParent: Schema.optionalKey(Schema.Unknown),
    shape: Schema.optionalKey(Schema.Unknown),
    stroke: Schema.optionalKey(Schema.Unknown),
    strokeWidth: Schema.optionalKey(Schema.Unknown),
    target: Schema.optionalKey(Schema.Unknown),
    targets: Schema.optionalKey(Schema.Unknown),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: InsertResultSchema,
  scope: "project",
});

export { setVectorDirectEdit };
