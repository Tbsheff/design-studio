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
    "Delete one design token that nothing uses, in one version. In a studio design system it removes the token from tokens.json and rebuilds tokens.css and DESIGN.md. In an imported app folder it removes the CSS custom property declarations from the app CSS files. Fails with Conflict and the use count when the token has any use, before the approval card shows.",
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
