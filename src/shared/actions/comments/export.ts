import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { CommentPrefillSchema, PrefillIdsSchema } from "./schema.js";

const exportComments = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Make the chat composer text and attachments for a set of comments, so the user can edit the prompt before a run. It saves element screenshots as attachments.",
  errors: [BadRequest, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/prefill",
  },
  id: "comments.export",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ids: PrefillIdsSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "comment.read",
  output: CommentPrefillSchema,
  scope: "project",
});

export { exportComments };
