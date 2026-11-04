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

const deleteTextDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Remove the text children of a target element. Saves one version.",
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
    path: "/api/projects/:projectId/d/:directionId/insert/clear-text",
  },
  id: "direct-edit.deleteText",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    target: Schema.optionalKey(Schema.Unknown),
  }),
  invalidates: ["direct-edit.getTree", "version.list", "version.listHistory"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: InsertResultSchema,
  scope: "project",
});

export { deleteTextDirectEdit };
