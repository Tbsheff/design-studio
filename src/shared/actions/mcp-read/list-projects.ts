import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectSummaryListSchema } from "./schema.js";

const listProjectsMcpRead = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the design projects in Design Studio with their directions and newest version ids.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects-summary" },
  id: "mcp-read.listProjects",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { name: "list_projects" },
  needs: "project.read",
  output: ProjectSummaryListSchema,
  scope: "org",
});

export { listProjectsMcpRead };
