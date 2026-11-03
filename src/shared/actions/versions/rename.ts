import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, VersionIdSchema } from "../_core/ids.js";
import { VersionRenamedSchema } from "./schema.js";

const renameVersions = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Set or clear the name of one saved version, shown in the studio Versions panel. A name is 80 characters or fewer; null or an empty name clears it.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PATCH",
    path: "/api/projects/:projectId/versions/:versionId",
  },
  id: "versions.rename",
  input: Schema.Struct({
    name: Schema.NullOr(Schema.String),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    versionId: VersionIdSchema,
  }),
  invalidates: [
    "versions.get",
    "versions.inspectDiff",
    "versions.list",
    "versions.listHistory",
    "versions.listHunks",
  ],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: VersionRenamedSchema,
  scope: "project",
});

export { renameVersions };
