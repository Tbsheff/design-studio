import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { PropsComponentListSchema } from "./schema.js";

const listPropsComponentsDirectEdit = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "List the React components of a direction with their props schema. Takes query, source, limit and cursor.",
  errors: [BadRequest, NotFound, DirectEditFailed, DirectEditNotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/props/components",
  },
  id: "direct-edit.listPropsComponents",
  input: Schema.Struct({
    cursor: Schema.optionalKey(Schema.String),
    directionId: DirectionIdSchema,
    limit: Schema.optionalKey(Schema.String),
    projectId: ProjectIdSchema,
    query: Schema.optionalKey(Schema.String),
    source: Schema.optionalKey(Schema.String),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: PropsComponentListSchema,
  scope: "project",
});

export { listPropsComponentsDirectEdit };
