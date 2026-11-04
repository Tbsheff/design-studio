import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { InsertResultSchema } from "./schema.js";

const insertComponentDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Insert an instance of a library component inside or after a target element. Writes the JSX, adds the import and saves one version.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/insert",
  },
  id: "direct-edit.insertComponent",
  input: Schema.Struct({
    component: Schema.optionalKey(Schema.Unknown),
    directionId: DirectionIdSchema,
    position: Schema.optionalKey(Schema.Unknown),
    projectId: ProjectIdSchema,
    props: Schema.optionalKey(Schema.Unknown),
    target: Schema.optionalKey(Schema.Unknown),
    text: Schema.optionalKey(Schema.Unknown),
  }),
  invalidates: ["direct-edit.getTree", "version.list", "version.listHistory"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: InsertResultSchema,
  scope: "project",
});

export { insertComponentDirectEdit };
