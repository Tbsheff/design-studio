import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  AttachmentIdsSchema,
  AuthorSchema,
  CommentDrawingSchema,
  CommentSchema,
  CommentTextSchema,
  DraftStatusSchema,
  FrameInputSchema,
  MentionsInputSchema,
  SelectionContextSchema,
  TargetInputSchema,
} from "./schema.js";

const createComment = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Pin a new comment on an element or a frame of a direction, from the studio Comments pane. The comment starts as a draft or queued and does not start a run.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments",
  },
  id: "comment.create",
  input: Schema.Struct({
    attachmentIds: Schema.optionalKey(AttachmentIdsSchema),
    author: Schema.optionalKey(AuthorSchema),
    context: Schema.optionalKey(SelectionContextSchema),
    directionId: DirectionIdSchema,
    drawing: Schema.optionalKey(CommentDrawingSchema),
    frame: Schema.optionalKey(FrameInputSchema),
    mentions: Schema.optionalKey(MentionsInputSchema),
    projectId: ProjectIdSchema,
    status: Schema.optionalKey(DraftStatusSchema),
    target: TargetInputSchema,
    text: CommentTextSchema,
  }),
  invalidates: ["comment.list"],
  mcp: { off: "ui-bootstrap" },
  needs: "comment.write",
  output: CommentSchema,
  scope: "project",
});

export { createComment };
