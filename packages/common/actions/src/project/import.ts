import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectImportFields, ProjectImportedSchema } from "./schema.js";

const importProject = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "import_project",
    set: "core",
    short:
      "Import a folder as a project. A folder with a Next.js app attaches the app and returns the first version state.",
  },
  confirm: "none",
  description:
    "Import a folder as a project. A folder with a Next.js app attaches the app and returns the first version state.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/import" },
  id: "project.import",
  input: Schema.Struct({
    ...ProjectImportFields,
  }),
  invalidates: ["project.list"],
  mcp: { name: "import_project" },
  needs: "project.create",
  output: ProjectImportedSchema,
  scope: "org",
});

export { importProject };
