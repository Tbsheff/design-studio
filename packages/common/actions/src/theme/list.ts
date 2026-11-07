import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { ThemeSchema } from "./schema.js";

const listTheme = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "list_theme",
    set: "tweak",
    short:
      "List stored theme candidates with palette, type pair, contrast and the live one.",
  },
  confirm: "none",
  description:
    "List the theme candidates stored for the direction, newest set first. Each one has a palette and type pair for light and dark, the contrast ratios of its text and surface pairs, and a flag for the one shown live now.",
  errors: [BadRequest, NotFound, Conflict],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/themes",
  },
  id: "theme.list",
  input: Schema.Struct({
    ...PageFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_theme" },
  needs: "project.read",
  output: pageOf(ThemeSchema),
  scope: "project",
});

export { listTheme };
