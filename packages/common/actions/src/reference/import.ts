import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  ReferenceDataFieldSchema,
  ReferenceFileNameFieldSchema,
  ReferenceNameFieldSchema,
  ReferencePathFieldSchema,
  ReferenceSchema,
} from "./schema.js";

const importReference = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "import_reference",
    set: "core",
    short:
      "Copy a folder, zip or file into the project as read-only reference material, and index it.",
  },
  confirm: "none",
  description:
    "Import reference material into a project. Give a local path to a folder, zip, PDF, Markdown, CSV, JSON or text file, or file bytes as base64. The studio copies text and images into reference/<name>/, skips node_modules, .git and binaries, writes an index, and tells the agent the files are there.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/references" },
  id: "reference.import",
  input: Schema.Struct({
    data: ReferenceDataFieldSchema,
    fileName: ReferenceFileNameFieldSchema,
    name: ReferenceNameFieldSchema,
    path: ReferencePathFieldSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["project.get"],
  mcp: { name: "import_reference" },
  needs: "project.update",
  output: ReferenceSchema,
  scope: "project",
});

export { importReference };
