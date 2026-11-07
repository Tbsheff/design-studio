import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ThemeAppliedSchema, ThemeIdSchema } from "./schema.js";

const applyTheme = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "apply_theme",
    set: "tweak",
    short:
      "Write a stored theme to the project tokens as one version, Apply theme. Names the token file.",
  },
  confirm: "none",
  description:
    "Write one stored theme candidate to the project token names as one version named Apply theme. The reply names the token file written. Undo restores every token value. Clears the live preview.",
  errors: [BadRequest, NotFound, Conflict],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/themes/apply",
  },
  id: "theme.apply",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    themeId: ThemeIdSchema,
  }),
  invalidates: ["theme.list", "version.list"],
  mcp: { name: "apply_theme" },
  needs: "project.update",
  output: ThemeAppliedSchema,
  scope: "project",
});

export { applyTheme };
