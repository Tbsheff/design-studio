import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { DirectEditError } from "../_core/errors/direct-edit-error.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { CreateTokenFields, CreateTokenResultSchema } from "./schema.js";

const createTokenDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Create a design token in a direction. Can also apply the new token to one selected element in the same edit.",
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
    path: "/api/projects/:projectId/d/:directionId/design-system/tokens",
  },
  id: "direct-edit.createToken",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...CreateTokenFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getDesignSystem"],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: CreateTokenResultSchema,
  scope: "project",
});

export { createTokenDirectEdit };
