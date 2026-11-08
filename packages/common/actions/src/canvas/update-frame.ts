import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  FrameDirectionField,
  FramesPlacedSchema,
  PlaceFrameListSchema,
} from "./frame/schema.js";

const updateFrameCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "canvas_place",
    set: "core",
    short:
      "Add or move frames on the studio canvas, in order: label, page, size and position beside another frame.",
  },
  confirm: "none",
  description:
    "Add or move frames on the studio canvas. Pass { frames: [...] }, applied in order. Each item: frame (id or @label to move; leave out to add), label, path (a query string or #hash is dropped, with a warning), viewport or width/height, and one of below / rightOf / leftOf / above (another frame) with gap, or absolute x/y. Returns the placed frames and overlap warnings.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/canvas/frames" },
  id: "canvas.updateFrame",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    ...FrameDirectionField,
    frames: PlaceFrameListSchema,
  }),
  invalidates: ["canvas.inspect"],
  mcp: { name: "canvas_place" },
  needs: "project.update",
  output: FramesPlacedSchema,
  scope: "project",
});

export { updateFrameCanvas };
