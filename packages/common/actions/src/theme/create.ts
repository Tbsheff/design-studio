import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ThemeCreateFields, ThemeCreatedSchema } from "./schema.js";

const createTheme = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "create_theme",
    set: "tweak",
    short:
      "Build theme candidates (palette and type pair) from the tokens or a brief. Offline. Stores them for set_theme.",
  },
  confirm: "none",
  description:
    "Build whole-theme candidates, each with a palette and a type pair for light and dark, from the project tokens or a brief. A seed makes the result repeat. Every text and surface pair must pass contrast, or the candidate is dropped. Stores the candidates. Writes no source file and makes no model call, so it runs offline.",
  errors: [BadRequest, NotFound, Conflict],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/themes",
  },
  id: "theme.create",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...ThemeCreateFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["theme.list"],
  mcp: { name: "create_theme" },
  needs: "project.update",
  output: ThemeCreatedSchema,
  scope: "project",
});

export { createTheme };
