import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectSearchResultSchema } from "./schema.js";

const searchProject = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Find projects and app routes by text for the studio command palette. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/project-search" },
  id: "project.search",
  input: Schema.Struct({
    limit: Schema.optionalKey(Schema.Int),
    project: Schema.optionalKey(Schema.String),
    query: Schema.optionalKey(Schema.String),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: ProjectSearchResultSchema,
  scope: "org",
});

export { searchProject };
