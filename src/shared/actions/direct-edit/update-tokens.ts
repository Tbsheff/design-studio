import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { TokenChangesFields, UpdateTokensResultSchema } from "./schema.js";

const updateTokensDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Change the values of design tokens in a direction. Writes the token source and saves a version.",
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
    path: "/api/projects/:projectId/d/:directionId/design-system/tokens/update",
  },
  id: "direct-edit.updateTokens",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...TokenChangesFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getDesignSystem"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: UpdateTokensResultSchema,
  scope: "project",
});

export { updateTokensDirectEdit };
