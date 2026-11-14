import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { FontSchema } from "./schema.js";

const listFont = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "list_font",
    set: "core",
    short:
      "List the fonts that a direction loads, with source, token, Tailwind class and the value to write.",
  },
  confirm: "none",
  description:
    "List the font families that a direction loads: next/font imports, @font-face rules, font tokens and Google Fonts links, then the system fonts. Each item has the family, the source, the token or null, the Tailwind class or null, and the font-family value to write.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/fonts",
  },
  id: "font.list",
  input: Schema.Struct({
    ...PageFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_font" },
  needs: "project.read",
  output: pageOf(FontSchema),
  scope: "project",
});

export { listFont };
