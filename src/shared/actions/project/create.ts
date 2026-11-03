import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectCreateFields, ProjectCreatedSchema } from "./schema.js";

const createProject = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Create a design project in a folder, apply a design system and design rules, and optionally start the first run.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects" },
  id: "project.create",
  input: Schema.Struct({
    ...ProjectCreateFields,
  }),
  invalidates: ["project.list"],
  mcp: { off: "legacy-mcp" },
  needs: "project.create",
  output: ProjectCreatedSchema,
  scope: "org",
});

export { createProject };
