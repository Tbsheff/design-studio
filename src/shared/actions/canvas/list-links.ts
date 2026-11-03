import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { LinkListSchema } from "./schema.js";

const listLinksCanvas = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the saved prototype links of a project: id, frame, selector, target frame (or back), transition, and broken (null, or why the link no longer works). Also returns startFrame and the raw links file. Set check to true to render each page and mark links whose element is gone. Implicit links from page code come from list_implicit_links. Links live in the studio (.studio/links.json), not in the page code.",
  errors: [BadRequest, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/links" },
  id: "canvas.listLinks",
  input: Schema.Struct({
    check: Schema.optionalKey(Schema.Boolean),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { name: "list_links" },
  needs: "project.read",
  output: LinkListSchema,
  scope: "project",
});

export { listLinksCanvas };
