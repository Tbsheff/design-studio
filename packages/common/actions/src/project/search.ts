import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { ProjectSearchFields, SearchHitSchema } from "./schema.js";

const searchProject = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Find projects and app routes by text for the studio command palette. Each item has kind project or route. limit caps the projects and the routes each, and the result is one page. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/project-search" },
  id: "project.search",
  input: Schema.Struct({
    ...PageFields,
    ...ProjectSearchFields,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: pageOf(SearchHitSchema),
  scope: "org",
});

export { searchProject };
