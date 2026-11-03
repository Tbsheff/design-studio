import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { Unauthenticated } from "../_core/errors/unauthenticated.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import { ListProjectIdSchema, PublicationListSchema } from "./schema.js";

const listPublish = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_publications",
    set: "app",
    short:
      "List the publications of a project with their URL, status, view counts and published versions.",
  },
  confirm: "none",
  description:
    "List the publications of a project: id, title, URL, status (live, failed, ended, removed), source version, pages, size, password on or off, end date, view counts (total and last 7 days, no personal data), viewer comment count and published versions for rollback_publication. Read only. Publish puts a static copy of one saved version on the public internet through the user's own publish Worker. The user must click Allow in Design Studio for each publish, rollback and unpublish.",
  errors: [Unauthenticated, Unavailable],
  http: { method: "GET", path: "/api/projects/:projectId/publications" },
  id: "publish.list",
  input: Schema.Struct({
    projectId: ListProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_publications" },
  needs: "publication.read",
  output: PublicationListSchema,
  scope: "project",
});

export { listPublish };
