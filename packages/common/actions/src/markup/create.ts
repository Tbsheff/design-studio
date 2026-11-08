import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionIdSchema,
  FrameIdSchema,
  ProjectIdSchema,
} from "../_core/ids.js";
import {
  MarkupBoxesSchema,
  MarkupImageSchema,
  MarkupSchema,
} from "./schema.js";

const createMarkup = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_markup",
    set: "core",
    short:
      "Save a marked-up picture of a frame and list the layers under each box. Use it when the user draws on a design.",
  },
  confirm: "none",
  description:
    "Save a picture of one canvas frame with the user's pen strokes, arrows and notes. Maps each marked box to the layer under it and returns the picture path and the layer ids.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/markups" },
  id: "markup.create",
  input: Schema.Struct({
    boxes: MarkupBoxesSchema,
    directionId: DirectionIdSchema,
    frameId: FrameIdSchema,
    image: MarkupImageSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["project.get"],
  mcp: { name: "create_markup" },
  needs: "project.update",
  output: MarkupSchema,
  scope: "project",
});

export { createMarkup };
