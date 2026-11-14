import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { Forbidden } from "../_core/errors/forbidden.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { ReviewRunFields } from "./payload/schema.js";
import { ReviewResultSchema } from "./schema.js";

const runReviewDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Run the studio Review panel checks on one canvas frame and return the findings: color contrast, tap target size, missing alt text and other axe-core rules, off-token values, clipped content, type scale, line length, line height and spacing steps, and breaks of the project design rules (see get_design_rules). Each finding has an id, severity, element, selector, source and message. fix is a direct fix that needs no judgment, or null. Read only. Apply a fix with apply_fix.",
  errors: [
    Forbidden,
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
    ...ReviewRunFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getReview"],
  mcp: { name: "review_frame" },
  needs: "project.read",
  output: ReviewResultSchema,
  scope: "project",
});

export { runReviewDirectEdit };
