import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { SaveRulesResultSchema } from "./schema.js";

const setRulesDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Replace the design rules of a direction. Saves one version when the rules live in the project repo.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/rules",
  },
  id: "direct-edit.setRules",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    text: Schema.optionalKey(Schema.Unknown),
  }),
  invalidates: ["direct-edit.getRules"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: SaveRulesResultSchema,
  scope: "project",
});

export { setRulesDirectEdit };
