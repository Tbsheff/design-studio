import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { TokenDeleteFields, TokenDeletedSchema } from "./schema.js";

const deleteToken = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_token",
    set: "core",
    short:
      "Delete an unused design token after the user approves. Fails with the use count when the token is used.",
  },
  confirm: "user",
  description:
    "Delete one design token that nothing uses. Removes its CSS custom property declarations from the app CSS files in one version. Fails with Conflict and the use count when the token has any use. The approval card lists the definition and the use count.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/tokens/delete",
  },
  id: "token.delete",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...TokenDeleteFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [
    "direct-edit.getDesignSystem",
    "token.listClasses",
    "token.listUsage",
    "version.list",
  ],
  mcp: { name: "delete_token" },
  needs: "project.update",
  output: TokenDeletedSchema,
  scope: "project",
});

export { deleteToken };
