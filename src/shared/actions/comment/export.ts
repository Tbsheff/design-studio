import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { CommentPrefillSchema, PrefillIdsSchema } from "./schema.js";

const exportComment = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Make the chat composer text and attachments for a set of comments, so the user can edit the prompt before a run. It saves element screenshots as attachments.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/prefill",
  },
  id: "comment.export",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ids: PrefillIdsSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "legacy-mcp" },
  needs: "comment.read",
  output: CommentPrefillSchema,
  scope: "project",
});

export { exportComment };
