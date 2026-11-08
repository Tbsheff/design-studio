import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ProjectTrashedSchema } from "./schema.js";

const deleteProject = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_project",
    set: "core",
    short:
      "Move one project to Trash after the user approves. Returns the trash id.",
  },
  confirm: "user",
  description:
    "Move one project to Trash after the user approves. The user can restore it from Trash. Returns the trash id.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "DELETE", path: "/api/projects/:projectId" },
  id: "project.delete",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
  }),
  invalidates: ["project.list", "project.search"],
  mcp: { name: "delete_project" },
  needs: "project.delete",
  output: ProjectTrashedSchema,
  scope: "project",
});

export { deleteProject };
