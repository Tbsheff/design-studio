import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ViewportInspectedSchema, ViewportMatrixFields } from "./schema.js";

const inspectViewport = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "inspect_viewport_matrix",
    set: "core",
    short:
      "Check one page at several widths and color schemes for overflow, clipped text, small tap targets and sideways scroll.",
  },
  confirm: "none",
  description:
    "Render one page at each width and color scheme. Report per cell overflow, clipped text, tap targets under 44 px for widths up to 768, and horizontal scroll. Writes a contact sheet PNG of all cells and returns its path.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/viewport-matrix",
  },
  id: "viewport.inspect",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...ViewportMatrixFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_viewport_matrix" },
  needs: "project.read",
  output: ViewportInspectedSchema,
  scope: "project",
});

export { inspectViewport };
