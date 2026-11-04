import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unauthenticated } from "../_core/errors/unauthenticated.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ShareIdSchema, ShareRevokedSchema } from "./schema.js";

const deleteShare = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "revoke_share_link",
    set: "app",
    short:
      "Turn off a share link now. Its images and comment form stop working at once.",
  },
  confirm: "user",
  description:
    "Turn off a share link now. The link, its images and its comment form stop working at once and the snapshot images are deleted. Comments already sent stay in the Comments pane.",
  errors: [BadRequest, Conflict, NotFound, Unauthenticated, Unavailable],
  http: { method: "DELETE", path: "/api/projects/:projectId/shares/:shareId" },
  id: "share.delete",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    shareId: ShareIdSchema,
  }),
  invalidates: ["share.list"],
  mcp: { name: "revoke_share_link" },
  needs: "share.revoke",
  output: ShareRevokedSchema,
  scope: "project",
});

export { deleteShare };
