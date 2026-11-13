import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { TokenImportedSchema } from "./schema.js";

const importToken = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "import_token",
    set: "design-system",
    short:
      "Copy the current CSS tokens of the linked app into this prototype's tokens.css, and list what changed.",
  },
  confirm: "none",
  description:
    "Copy the current CSS tokens of the linked app into the tokens.css file of this prototype. Use it after the app tokens change in code. It writes one version and returns the counts of added, changed and removed tokens. When nothing changed, it writes no version and versionId is null. The app files do not change. It works only in a prototype made beside an app.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/import",
  },
  id: "token.import",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [
    "token.listUsage",
    "direct-edit.getDesignSystem",
    "version.list",
  ],
  mcp: { name: "import_token" },
  needs: "project.update",
  output: TokenImportedSchema,
  scope: "project",
});

export { importToken };
