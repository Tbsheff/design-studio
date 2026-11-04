import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { ProjectSchema } from "./schema.js";

const listProject = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the design projects in Design Studio with their directions, one page at a time. Pass next as cursor to get the next page. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects" },
  id: "project.list",
  input: Schema.Struct({
    ...PageFields,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: pageOf(ProjectSchema),
  scope: "org",
});

export { listProject };
