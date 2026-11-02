import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { CommentIdSchema } from "../_core/ids.js";
import { DeletedSchema, PublicationTargetFields } from "./schema.js";

const deleteCommentPublish = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Delete one viewer comment of a publication. Only the owner of the publication can delete a comment. A publication on an old per-design Worker has no comments.",
  errors: [BadRequest, NotFound],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/publications/:publicationId/comments/:commentId",
  },
  id: "publish.deleteComment",
  input: Schema.Struct({
    ...PublicationTargetFields,
    commentId: CommentIdSchema,
  }),
  invalidates: ["publish.listComments", "publish.list"],
  mcp: { off: "ui-bootstrap" },
  needs: "comment.delete",
  output: DeletedSchema,
  scope: "project",
});

export { deleteCommentPublish };
