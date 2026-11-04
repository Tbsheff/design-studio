import { Schema } from "effect";

import { RulesTestFields } from "../_core/direct-edit-payload.js";
import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { RulesTestResultSchema } from "./schema.js";

const runRulesTestDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Check design rules on one canvas frame without saving them. Returns hits for each rule. Writes nothing.",
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
    path: "/api/projects/:projectId/d/:directionId/rules/test",
  },
  id: "direct-edit.runRulesTest",
  input: Schema.Struct({
    ...RulesTestFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "legacy-mcp" },
  needs: "project.read",
  output: RulesTestResultSchema,
  scope: "project",
});

export { runRulesTestDirectEdit };
