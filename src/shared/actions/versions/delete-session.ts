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

const deleteSessionVersions = defineAction({
  access: "destructive",
  agent: { off: "ui-bootstrap" },
  confirm: "user",
  description:
    "Discard the open edit session of a direction and put the files back to baseVersionId, from the studio edit bar. The user must click Allow in Design Studio first.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-session/discard",
  },
  id: "versions.deleteSession",
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
    "versions.get",
    "versions.inspectDiff",
    "versions.list",
    "versions.listHistory",
    "versions.listHunks",
  ],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: SessionEndSchema,
  scope: "project",
});

export { deleteSessionVersions };
