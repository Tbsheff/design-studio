import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  AuthorSchema,
  CommentAddedSchema,
  CommentTextSchema,
  ElementSelectorSchema,
  DirectionFieldSchema,
  PagePathFieldSchema,
  ProjectFieldSchema,
} from "./schema.js";

const insertComment = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Pin a comment on an element (CSS selector) or on the whole frame. The comment shows your client name. It does not send anything to the studio agent.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/comments" },
  id: "comment.insert",
  input: Schema.Struct({
    author: Schema.optionalKey(AuthorSchema),
    directionId: Schema.optionalKey(DirectionFieldSchema),
    path: Schema.optionalKey(PagePathFieldSchema),
    projectId: ProjectFieldSchema,
    selector: Schema.optionalKey(ElementSelectorSchema),
    text: CommentTextSchema,
  }),
  invalidates: ["comment.list"],
  mcp: { name: "add_comment" },
  needs: "comment.write",
  output: CommentAddedSchema,
  scope: "project",
});

export { insertComment };
