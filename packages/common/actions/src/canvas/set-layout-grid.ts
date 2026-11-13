import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { FrameDirectionField, FrameNameSchema } from "./frame/schema.js";
import { LayoutGridSchema, LayoutGridSetSchema } from "./layout-grid/schema.js";

const setLayoutGridCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_layout_grid_canvas",
    set: "core",
    short:
      "Set or remove the layout grid of one canvas frame: columns, gutter, margin and an optional row step.",
  },
  confirm: "none",
  description:
    "Set the layout grid of one canvas frame: column count, gutter, outer margin and an optional row step, in CSS px. The user sees the grid over the frame, and canvas_list returns it. Line up page content with the columns. Null removes the grid. Undo reverses it.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/canvas/layout-grid" },
  id: "canvas.setLayoutGrid",
  input: Schema.Struct({
    ...FrameDirectionField,
    frame: FrameNameSchema.annotate({
      description: "Frame id or @label from canvas_list.",
    }),
    layoutGrid: Schema.NullOr(LayoutGridSchema).annotate({
      description:
        "The grid. For a desktop frame: 12 columns, gutter 24, margin 80. For a mobile frame: 4 columns, gutter 16, margin 16. Null removes the grid.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: ["canvas.inspect"],
  mcp: { name: "set_layout_grid_canvas" },
  needs: "project.update",
  output: LayoutGridSetSchema,
  scope: "project",
});

export { setLayoutGridCanvas };
