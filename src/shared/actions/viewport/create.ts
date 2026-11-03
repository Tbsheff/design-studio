import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ViewportCreatedSchema, ViewportMatrixFields } from "./schema.js";

const createViewport = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_viewport_matrix",
    set: "core",
    short:
      "Place a labeled group of canvas frames for one page at several widths and light or dark schemes.",
  },
  confirm: "none",
  description:
    "Place a labeled canvas frame group of one page: one frame per width and color scheme, in a grid under the existing frames. Frames of an earlier matrix are reused. Default widths are 375, 768 and 1280.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/viewport-matrix",
  },
  id: "viewport.create",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...ViewportMatrixFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["canvas.getDoc"],
  mcp: { name: "create_viewport_matrix" },
  needs: "project.update",
  output: ViewportCreatedSchema,
  scope: "project",
});

export { createViewport };
