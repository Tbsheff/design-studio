import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { WorkTreeStatusSchema } from "./schema.js";

const restoreWorkTreeVersion = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Discard the unfinished changes of a direction and return its files to the head version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/discard",
  },
  id: "version.restoreWorkTree",
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
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: WorkTreeStatusSchema,
  scope: "project",
});

export { restoreWorkTreeVersion };
