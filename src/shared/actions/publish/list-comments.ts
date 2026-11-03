import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, PublicationIdSchema } from "../_core/ids.js";
import { PublicationCommentListSchema } from "./schema.js";

const listCommentsPublish = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the viewer comments of one publication. Each comment has its id, author name, text and time. A publication on an old per-design Worker has no comments. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/publications/:publicationId/comments",
  },
  id: "publish.listComments",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    publicationId: PublicationIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "publication.read",
  output: PublicationCommentListSchema,
  scope: "project",
});

export { listCommentsPublish };
