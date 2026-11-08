import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { ShareLinkSchema, ShareServerStateSchema } from "./schema.js";

const listShare = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_share_links",
    set: "core",
    short:
      "List the share links of a project with their title, frames, expiry, state and viewer comment count.",
  },
  confirm: "none",
  description:
    "List the share links of a project: id, title, frames, expiry, whether each is active or live, viewer count and how many viewer comments came in, plus the share listener state. Read only; it never returns tokens or URLs. Read viewer comments with list_comments. A share link is a read-only PNG snapshot of canvas frames, served on a separate listener on this computer unless the user turns on Allow on local network.",
  errors: [],
  http: { method: "GET", path: "/api/projects/:projectId/shares" },
  id: "share.list",
  input: Schema.Struct({
    ...PageFields,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: [],
  mcp: { name: "list_share_links" },
  needs: "project.read",
  output: pageOf(ShareLinkSchema, { server: ShareServerStateSchema }),
  scope: "project",
});

export { listShare };
