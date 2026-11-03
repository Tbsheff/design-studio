import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  ImplicitLinkIdListSchema,
  LinkKeptSchema,
  LinkMotionFields,
} from "./schema.js";

const LinkIdsSchema = Schema.Union([
  Schema.Literal("all"),
  ImplicitLinkIdListSchema,
]);

const keepLinkCanvas = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Save implicit links (found from a href or location.href between pages, or Next.js Link) as normal prototype links, so they show solid on the canvas and can change action or transition. Pass the ids from list_implicit_links, or all. Play already uses implicit links without this.",
  errors: [BadRequest, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/links/keep" },
  id: "canvas.keepLink",
  input: Schema.Struct({
    ...LinkMotionFields,
    ids: LinkIdsSchema,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
  mcp: { name: "keep_links" },
  needs: "project.update",
  output: LinkKeptSchema,
  scope: "project",
});

export { keepLinkCanvas };
