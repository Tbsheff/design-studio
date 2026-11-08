import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, VersionIdSchema } from "../_core/ids.js";
import { VersionExportSchema } from "./schema.js";

const exportVersion = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description: "Export one saved version as a zip file of its files.",
  errors: [BadRequest, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/versions/:versionId/export",
  },
  id: "version.export",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    versionId: VersionIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "studio.read",
  output: VersionExportSchema,
  scope: "project",
});

export { exportVersion };
