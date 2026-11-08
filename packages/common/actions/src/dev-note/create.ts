import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { FrameIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  DevNoteKindSchema,
  DevNoteSchema,
  DevNoteTextSchema,
  LayerFieldSchema,
  MeasuredFieldSchema,
  TargetSourceFieldSchema,
} from "./schema.js";

const createDevNote = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "create_dev_note",
    set: "core",
    short:
      "Add a dev note to a frame or layer. Measure the layer to store box, padding, gap, radius, font and colors with token names.",
  },
  confirm: "none",
  description:
    "Add a dev note to a frame or to one layer: a spec, behavior, content or accessibility note for the developer. Set isMeasured to true to capture the computed box, padding, gap, radius, font and colors of the layer, mapped to token names. The note saves outside the canvas document and makes no version. An outside coding agent reads it with list_dev_note.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/dev-notes" },
  id: "dev-note.create",
  input: Schema.Struct({
    frameId: FrameIdSchema,
    isMeasured: MeasuredFieldSchema,
    kind: DevNoteKindSchema,
    layerId: LayerFieldSchema,
    projectId: ProjectIdSchema,
    targetSource: TargetSourceFieldSchema,
    text: DevNoteTextSchema,
  }),
  invalidates: ["dev-note.list"],
  mcp: { name: "create_dev_note" },
  needs: "project.update",
  output: DevNoteSchema,
  scope: "project",
});

export { createDevNote };
