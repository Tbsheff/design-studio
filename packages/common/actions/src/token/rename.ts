import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { TokenRenameFields, TokenRenamedSchema } from "./schema.js";

const renameToken = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "rename_token",
    set: "core",
    short:
      "Rename a design token and every use of it in one version. Fails when the new name is taken.",
  },
  confirm: "none",
  description:
    "Rename one design token and every use that list_usage_token finds: var(--name) and the Tailwind classes of the token. In a studio design system it moves the token in tokens.json and rebuilds tokens.css and DESIGN.md; a name outside the color group keeps its group prefix (--space-). In an imported app folder it changes the CSS custom property definition (the @theme entry or the Tailwind theme key). All files change in one version. Fails with Conflict when the new name is taken.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/rename",
  },
  id: "token.rename",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...TokenRenameFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [
    "direct-edit.getDesignSystem",
    "token.listClasses",
    "token.listUsage",
    "version.list",
  ],
  mcp: { name: "rename_token" },
  needs: "project.update",
  output: TokenRenamedSchema,
  scope: "project",
});

export { renameToken };
