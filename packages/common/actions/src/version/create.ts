import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { VersionSchema } from "./schema.js";

const createVersion = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_version",
    set: "core",
    short: "Keep the unfinished changes of a direction as a new saved version.",
  },
  confirm: "none",
  description:
    "Keep the unfinished changes of a direction as a new saved version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/keep",
  },
  id: "version.create",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [
    "version.get",
    "version.inspectDiff",
    "version.list",
    "version.listHistory",
    "version.listHunks",
  ],
  mcp: { name: "create_version" },
  needs: "project.update",
  output: VersionSchema,
  scope: "project",
});

export { createVersion };
