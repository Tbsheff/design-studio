import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionIdSchema,
  ProjectIdSchema,
  VersionIdSchema,
} from "../_core/ids.js";
import { VersionSchema } from "./schema.js";

const restoreVersion = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Make an older version the current design of a direction. Saved as a new version that undo takes back. The current prototype links and canvas frames stay; only the page files change.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/restore",
  },
  id: "version.restore",
  input: Schema.Struct({
    directionId: DirectionIdSchema.annotate({
      description: "Direction id. Use the main direction id for the main one.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    versionId: VersionIdSchema.annotate({
      description: "Version id from list_versions.",
    }),
  }),
  invalidates: [
    "version.get",
    "version.inspectDiff",
    "version.list",
    "version.listHistory",
    "version.listHunks",
  ],
  mcp: { name: "restore_version" },
  needs: "project.update",
  output: VersionSchema,
  scope: "project",
});

export { restoreVersion };
