import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, VersionIdSchema } from "../_core/ids.js";
import { VersionPreviewSchema } from "./schema.js";

const inspectPreviewVersion = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description: "Get the preview URL of one saved version.",
  errors: [BadRequest, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/versions/:versionId/preview",
  },
  id: "version.inspectPreview",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    versionId: VersionIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "studio.read",
  output: VersionPreviewSchema,
  scope: "project",
});

export { inspectPreviewVersion };
