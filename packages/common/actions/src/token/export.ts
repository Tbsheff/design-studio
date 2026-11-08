import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { TokenExportFields, TokenExportedSchema } from "./schema.js";

const exportToken = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "export_token",
    set: "design-system",
    short:
      "Export the project design tokens as W3C DTCG JSON, Figma Variables JSON, a Tailwind v4 theme or CSS custom properties. Returns text and a file name.",
  },
  confirm: "none",
  description:
    "Export the project design tokens as text. format is dtcg (W3C DTCG JSON), figma (Figma Variables with Light and Dark modes), tailwind (a v4 theme block with a dark override) or css (root and dark custom properties). modes is light-dark (default), light or dark. groups limits the export to named token groups. Returns the file text, the file name, token and alias counts, and the tokens that the format cannot hold. Writes no file. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/tokens/export" },
  id: "token.export",
  input: Schema.Struct({
    ...TokenExportFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "export_token" },
  needs: "project.read",
  output: TokenExportedSchema,
  scope: "project",
});

export { exportToken };
