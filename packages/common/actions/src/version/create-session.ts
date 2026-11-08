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
import { SessionEndSchema } from "./schema.js";

const createSessionVersion = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_session_version",
    set: "core",
    short:
      "Save the open edit session of a direction as one new version. The session starts at baseVersionId.",
  },
  confirm: "none",
  description:
    "Save the open edit session of a direction as one new version, from the studio edit bar. The session starts at baseVersionId.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-session/save",
  },
  id: "version.createSession",
  input: Schema.Struct({
    baseVersionId: VersionIdSchema,
    directionId: DirectionIdSchema.annotate({
      description: "Direction id. Use the main direction id for the main one.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [
    "version.get",
    "version.inspectDiff",
    "version.list",
    "version.listHistory",
    "version.listHunks",
  ],
  mcp: { name: "create_session_version" },
  needs: "project.update",
  output: SessionEndSchema,
  scope: "project",
});

export { createSessionVersion };
