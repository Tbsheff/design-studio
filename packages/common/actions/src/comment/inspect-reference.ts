import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionFieldSchema,
  PagePathFieldSchema,
  ProjectFieldSchema,
  ReferenceScoreSchema,
} from "./schema.js";

const IMAGE_MAX = 4096;

const FRAME_MAX = 60;

const WORST_MAX = 9;

const ImageFieldSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(IMAGE_MAX)
).annotate({
  description: "Absolute path of the reference picture on this computer.",
});

const FrameFieldSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FRAME_MAX)
).annotate({
  description:
    "Frame id or @label from canvas_list. Leave out for the first frame of the direction.",
});

const LimitFieldSchema = Schema.Int.check(
  Schema.isBetween({ maximum: WORST_MAX, minimum: 1 })
).annotate({
  description: "How many of the worst areas to list, from 1 to 9. Default 4.",
});

const inspectReferenceComment = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "compare_to_reference",
    set: "core",
    short:
      "Score a frame against the reference picture the user attached (0-100) and get a diff image. Changes nothing.",
  },
  confirm: "none",
  description:
    "Compare a canvas frame with a reference picture (PNG, JPEG, GIF or WebP). Returns a match score from 0 to 100 (content 20%, edges 80%), the 3x3 areas that differ most and the path of a side-by-side diff PNG. A score under 80 means the frame does not match yet. Read only; changes no project file.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/reference-check" },
  id: "comment.inspectReference",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    frame: Schema.optionalKey(FrameFieldSchema),
    image: ImageFieldSchema,
    limit: Schema.optionalKey(LimitFieldSchema),
    path: Schema.optionalKey(PagePathFieldSchema),
    projectId: ProjectFieldSchema,
  }),
  invalidates: [],
  mcp: { name: "compare_to_reference" },
  needs: "studio.read",
  output: ReferenceScoreSchema,
  scope: "project",
});

export { inspectReferenceComment };
