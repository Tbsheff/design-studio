import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ImplicitLinkListSchema } from "./schema.js";

const listImplicitLinksCanvas = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the implicit links of a project: links found in the page code from a href, a form action, location.href or Next.js Link between frames. Each has an id that starts with i. Play uses them as they are. Save them with keep_links to change the action or transition.",
  errors: [BadRequest, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/links/implicit" },
  id: "canvas.listImplicitLinks",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { name: "list_implicit_links" },
  needs: "project.read",
  output: ImplicitLinkListSchema,
  scope: "project",
});

export { listImplicitLinksCanvas };
