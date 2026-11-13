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
import { DirectEditFields, DirectEditResultSchema } from "./schema.js";

const applyDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Apply one direct edit to a direction: a single edit, a batch, a structure edit, a style replace or an arrange. Writes the source and saves a version.",
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
    path: "/api/projects/:projectId/d/:directionId/direct-edit",
  },
  id: "direct-edit.apply",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...DirectEditFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getTree", "version.list", "version.listHistory"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: DirectEditResultSchema,
  scope: "project",
});

export { applyDirectEdit };
