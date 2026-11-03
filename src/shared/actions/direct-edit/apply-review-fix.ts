import { Schema } from "effect";

import { ReviewFixFields } from "../../direct-edit-payload.js";
import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { ReviewFixResultSchema } from "./schema.js";

const applyReviewFixDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Apply the direct fixes of one or more review findings as one version.",
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
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: ReviewFixResultSchema,
  scope: "project",
});

export { applyReviewFixDirectEdit };
