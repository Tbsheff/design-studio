import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { VersionListSchema } from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects",
});

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const listVersionsWorkspace = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_versions",
    set: "core",
    short: "Read only. List the saved versions of one direction, newest first.",
  },
  confirm: "none",
  description: "List the saved versions of one direction, newest first.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/versions" },
  id: "workspace.listVersions",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    projectId: ProjectFieldSchema,
  }),
  invalidates: [],
  mcp: { name: "list_versions" },
  needs: "project.read",
  output: VersionListSchema,
  scope: "project",
});

export { listVersionsWorkspace };
