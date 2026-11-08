import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { PropsInstanceFields } from "./payload/schema.js";
import { PropsInstanceSchema } from "./schema.js";

const inspectPropsInstanceDirectEdit = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Find the component instance at a use site or owner stack and read its props. Writes nothing.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/props/instance",
  },
  id: "direct-edit.inspectPropsInstance",
  input: Schema.Struct({
    ...PropsInstanceFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "legacy-mcp" },
  needs: "project.read",
  output: PropsInstanceSchema,
  scope: "project",
});

export { inspectPropsInstanceDirectEdit };
