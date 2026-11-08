import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "../direct-edit/errors/direct-edit-conflict.js";
import { DirectEditFailed } from "../direct-edit/errors/direct-edit-failed.js";
import { DirectEditNotFound } from "../direct-edit/errors/direct-edit-not-found.js";
import { TokenSetFields, TokenSetSchema } from "./schema.js";

const setToken = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_token",
    set: "core",
    short:
      "Change one design token value (tokens.json, or the app token CSS declaration). theme dark changes the dark value.",
  },
  confirm: "none",
  description:
    "Change one design token value, found by CSS variable or path, with the same code path as the studio Tokens panel. In a studio design system it edits tokens.json. In an imported app folder it rewrites only that declaration in the app CSS file (for example the Tailwind @theme, :root or .dark block). A version is saved.",
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
    path: "/api/projects/:projectId/d/:directionId/tokens/set",
  },
  id: "token.set",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...TokenSetFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getDesignSystem", "version.list"],
  mcp: { name: "set_token" },
  needs: "project.update",
  output: TokenSetSchema,
  scope: "project",
});

export { setToken };
