import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ThemeImportFields, ThemeImportedSchema } from "./schema.js";

const importTheme = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "import_theme",
    set: "tweak",
    short:
      "Build a theme candidate from a site URL or a brand image. Colors, fonts and radius come from the source. Then call set_theme.",
  },
  confirm: "none",
  description:
    "Make one theme candidate from a web page URL or a PNG image path. Reads real colors, fonts and corner radius from the source, maps them to the token names of the project, and fixes text contrast. Give exactly one of url and imagePath. Stores the candidate. Next steps: set_theme to preview it on all frames, then apply_theme to write it.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/themes/import",
  },
  id: "theme.import",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...ThemeImportFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["theme.list"],
  mcp: { name: "import_theme" },
  needs: "project.update",
  output: ThemeImportedSchema,
  scope: "project",
});

export { importTheme };
