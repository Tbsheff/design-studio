import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ShareIdSchema, ShareLinkResultSchema } from "./schema.js";

const updateShare = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "update_share",
    set: "core",
    short:
      "Turn the studio cursor on or off for one live share link. Viewers of the link see your cursor when it is on.",
  },
  confirm: "none",
  description:
    "Turn the studio cursor on or off for one active live share link. When it is on, viewers of the link see your cursor on the shared frames.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/shares/:shareId" },
  id: "share.update",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    shareId: ShareIdSchema,
    studioCursor: Schema.Boolean,
  }),
  invalidates: ["share.list"],
  mcp: { name: "update_share" },
  needs: "project.update",
  output: ShareLinkResultSchema,
  scope: "project",
});

export { updateShare };
