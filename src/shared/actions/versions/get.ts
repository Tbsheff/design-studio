import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, VersionIdSchema } from "../_core/ids.js";
import { VersionSchema } from "./schema.js";

const getVersions = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Get one saved version by id: title, kind, name, parent, time and changed files.",
  errors: [BadRequest, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/versions/:versionId" },
  id: "versions.get",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    versionId: VersionIdSchema.annotate({
      description: "Version id from list_versions",
    }),
  }),
  invalidates: [],
  mcp: { name: "get_version" },
  needs: "project.read",
  output: VersionSchema,
  scope: "project",
});

export { getVersions };
