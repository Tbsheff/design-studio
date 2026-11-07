import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ThemeIdSchema, ThemeSetResultSchema } from "./schema.js";

const setTheme = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "set_theme",
    set: "tweak",
    short:
      "Show a stored theme live on all frames without a version. themeId null clears it.",
  },
  confirm: "none",
  description:
    "Show one stored theme candidate live on all frames of the direction, through the token preview. themeId null clears the preview. Writes no source file and makes no version. Use apply_theme to keep a theme.",
  errors: [BadRequest, NotFound, Conflict],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/themes/live",
  },
  id: "theme.set",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    themeId: Schema.NullOr(ThemeIdSchema),
  }),
  invalidates: ["theme.list"],
  mcp: { name: "set_theme" },
  needs: "project.update",
  output: ThemeSetResultSchema,
  scope: "project",
});

export { setTheme };
