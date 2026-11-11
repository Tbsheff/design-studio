import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import { ProjectImportFields, ProjectImportedSchema } from "./schema.js";

const importProject = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "import_project",
    set: "core",
    short:
      "Import a folder or clone a repo URL as a project. With isWorkspace, link any folder as a workspace for HTML prototypes and do not change it.",
  },
  confirm: "none",
  description:
    "Import a folder, or clone a public repo by https URL, as a project. Pass path or url, not both. A folder with a Next.js app attaches the app and returns the first version state. Import never installs packages and never starts the dev server. With isWorkspace true, any folder links as a workspace: the folder does not change, and create_prototype_project makes HTML prototypes for it in the Design Studio folder.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
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
