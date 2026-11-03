import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  ContentLayerSchema,
  ContentModeSchema,
  ContentPresetSchema,
  ContentRepeatSchema,
  ContentResultSchema,
} from "./schema.js";

const applyContent = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "apply_content",
    set: "core",
    short:
      "Fill a layer with realistic sample content or stress text, and repeat its first row. One undoable version.",
  },
  confirm: "none",
  description:
    "Replace placeholder text under one layer with realistic sample content, or stress the text with long, short, empty or pseudo-localized strings. Can clone the first row up to 50 times. Saved as one version that undo takes back.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/content",
  },
  id: "content.apply",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    layer: ContentLayerSchema,
    mode: Schema.optionalKey(ContentModeSchema),
    preset: Schema.optionalKey(ContentPresetSchema),
    projectId: ProjectIdSchema,
    repeat: Schema.optionalKey(ContentRepeatSchema),
    seed: Schema.optionalKey(Schema.Int),
  }),
  invalidates: ["version.list", "version.get"],
  mcp: { name: "apply_content" },
  needs: "project.update",
  output: ContentResultSchema,
  scope: "project",
});

export { applyContent };
