import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { Forbidden } from "../_core/errors/forbidden.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { InsertResultSchema } from "./schema.js";

const PATH_DATA_KEY = "d";

const VECTOR_KIND_KEY = "shape";

const setVectorDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Insert a vector shape, a path or a positioned text box, run a boolean on two shapes, or paint a shape. Saves one version.",
  errors: [
    Forbidden,
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/vector",
  },
  id: "direct-edit.setVector",
  input: Schema.Struct({
    [PATH_DATA_KEY]: Schema.optionalKey(Schema.Unknown),
    [VECTOR_KIND_KEY]: Schema.optionalKey(Schema.Unknown),
    boolean: Schema.optionalKey(Schema.Unknown),
    box: Schema.optionalKey(Schema.Unknown),
    directionId: DirectionIdSchema,
    fill: Schema.optionalKey(Schema.Unknown),
    name: Schema.optionalKey(Schema.Unknown),
    op: Schema.optionalKey(Schema.Unknown),
    page: Schema.optionalKey(Schema.Unknown),
    projectId: ProjectIdSchema,
    rects: Schema.optionalKey(Schema.Unknown),
    relativeParent: Schema.optionalKey(Schema.Unknown),
    stroke: Schema.optionalKey(Schema.Unknown),
    strokeWidth: Schema.optionalKey(Schema.Unknown),
    target: Schema.optionalKey(Schema.Unknown),
    targets: Schema.optionalKey(Schema.Unknown),
    text: Schema.optionalKey(Schema.String),
  }),
  invalidates: ["direct-edit.getTree", "version.list", "version.listHistory"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: InsertResultSchema,
  scope: "project",
});

export { setVectorDirectEdit };
