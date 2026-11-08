import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ProjectImportedSchema } from "./schema.js";

const duplicateProject = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "duplicate_project",
    set: "core",
    short: "Duplicate one project into a new project. Returns the copy.",
  },
  confirm: "none",
  description:
    "Duplicate one project. Copies its files and designs into a new project and returns the copy.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/duplicate" },
  id: "project.duplicate",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
  }),
  invalidates: ["project.list", "project.search"],
  mcp: { name: "duplicate_project" },
  needs: "project.create",
  output: ProjectImportedSchema,
  scope: "project",
});

export { duplicateProject };
