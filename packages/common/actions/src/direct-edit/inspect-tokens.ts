import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { TokenChangesQueryFields, TokenPreviewSchema } from "./schema.js";

const inspectTokensDirectEdit = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "inspect_tokens_direct_edit",
    set: "core",
    short:
      "Read only. Preview token changes for a direction: the CSS and errors for the new values. Writes nothing.",
  },
  confirm: "none",
  description:
    "Preview token changes for a direction. Returns the CSS and errors for the new values and writes nothing.",
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
    path: "/api/projects/:projectId/d/:directionId/design-system/preview",
  },
  id: "direct-edit.inspectTokens",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...TokenChangesQueryFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: TokenPreviewSchema,
  scope: "project",
});

export { inspectTokensDirectEdit };
