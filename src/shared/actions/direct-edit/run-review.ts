import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { ReviewResultSchema } from "./schema.js";

const runReviewDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Run the Review checks on one canvas frame and keep the result as the last review. Writes no file.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/review",
  },
  id: "direct-edit.runReview",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    frame: Schema.optionalKey(Schema.Unknown),
    height: Schema.optionalKey(Schema.Unknown),
    path: Schema.optionalKey(Schema.Unknown),
    projectId: ProjectIdSchema,
    selector: Schema.optionalKey(Schema.Unknown),
    width: Schema.optionalKey(Schema.Unknown),
  }),
  invalidates: ["direct-edit.getReview"],
  mcp: { off: "legacy-mcp" },
  needs: "project.read",
  output: ReviewResultSchema,
  scope: "project",
});

export { runReviewDirectEdit };
