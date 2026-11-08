import { Effect, Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import {
  DirectionIdSchema,
  FrameIdSchema,
  ProjectIdSchema,
} from "../_core/ids.js";
import { AttentionResultSchema } from "./schema.js";

const DEFAULT_WIDTH = 1440;

const MAX_WIDTH = 4096;

const MIN_WIDTH = 320;

const LayerFieldSchema = Schema.NullOr(
  Schema.String.check(Schema.isMinLength(1))
).pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const WidthRangeSchema = Schema.Int.check(
  Schema.isBetween({ maximum: MAX_WIDTH, minimum: MIN_WIDTH })
);

const WidthFieldSchema = WidthRangeSchema.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(DEFAULT_WIDTH))
);

const runAttentionCritique = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "run_attention_critique",
    set: "core",
    short:
      "Score where the eye goes on one frame from pixels. Ranks elements by share of attention and flags competing focal points. Saves the result. No model call.",
  },
  confirm: "none",
  description:
    "Render one canvas frame and predict where the eye goes, with no model call. Builds a saliency map from luminance contrast and color opponency, weights it by element area, contrast, type size and position, and returns a clarity score from 0 to 100, the ranked elements with their share of attention, and notes. Saves the result for get_attention_critique and a heatmap picture.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/critique/:frameId/attention",
  },
  id: "critique.runAttention",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    frameId: FrameIdSchema,
    layerId: LayerFieldSchema,
    projectId: ProjectIdSchema,
    width: WidthFieldSchema,
  }),
  invalidates: ["critique.getAttention"],
  mcp: { name: "run_attention_critique" },
  needs: "project.update",
  output: AttentionResultSchema,
  scope: "project",
});

export { runAttentionCritique };
