import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { LinkIdSchema, LinkSavedSchema } from "./schema.js";

const deleteLinkCanvas = defineAction({
  access: "destructive",
  agent: { off: "legacy-agent" },
  confirm: "user",
  description:
    "Remove one saved prototype link. The page and the frames stay. The change is one step in the edit history, so undo brings the link back.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "DELETE", path: "/api/projects/:projectId/links/:linkId" },
  id: "canvas.deleteLink",
  input: Schema.Struct({
    linkId: LinkIdSchema.annotate({
      description: "Link id from list_links, for example l2.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
  mcp: { name: "remove_link" },
  needs: "project.update",
  output: LinkSavedSchema,
  scope: "project",
});

export { deleteLinkCanvas };
