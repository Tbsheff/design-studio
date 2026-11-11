import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { ReferencePinSchema } from "./schema.js";

const listReference = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_reference",
    set: "core",
    short:
      "List the canvas frames pinned as style references in a project, with source file and screenshot paths.",
  },
  confirm: "none",
  description:
    "List the canvas frames that are pinned as style references in a project. Each item has the frame id, direction id, name, page path, source file path, screenshot path and pin time. Reads only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/references/pins" },
  id: "reference.list",
  input: Schema.Struct({
    ...PageFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_reference" },
  needs: "project.read",
  output: pageOf(ReferencePinSchema),
  scope: "project",
});

export { listReference };
