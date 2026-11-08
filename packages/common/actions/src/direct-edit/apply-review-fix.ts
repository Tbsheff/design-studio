import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { ReviewFixFields } from "./payload/schema.js";
import { ReviewFixResultSchema } from "./schema.js";

const applyReviewFixDirectEdit = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "apply_fix",
    set: "core",
    short:
      "Apply the direct fix of one or more review_frame findings by id. Several ids make one version and one undo step.",
  },
  confirm: "none",
  description:
    "Apply the direct fix of one or more review_frame findings, with the same code path as the Fix button in the Review panel. Several ids make one version and one undo step. Fixes of findings with shared set edit a shared component file and are skipped unless allowShared is true. Findings with fix null need judgment and are skipped. Runs review_frame again first when the design changed since the last review.",
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
    path: "/api/projects/:projectId/d/:directionId/review/fix",
  },
  id: "direct-edit.applyReviewFix",
  input: Schema.Struct({
    ...ReviewFixFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getReview"],
  mcp: { name: "apply_fix" },
  needs: "project.update",
  output: ReviewFixResultSchema,
  scope: "project",
});

export { applyReviewFixDirectEdit };
