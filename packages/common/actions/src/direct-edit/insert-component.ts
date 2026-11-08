import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { InsertComponentFields } from "./payload/schema.js";
import { InsertResultSchema } from "./schema.js";

const insertComponentDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Insert an instance of a React component from the project library, like dragging it from the studio Components panel: it writes the JSX inside or after the target element, fills required props from the props type, and adds or extends the import line. One version and one undo step. Targets made by .map(), shown by a condition, or the top element of a component are refused with a reason.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/insert",
  },
  id: "direct-edit.insertComponent",
  input: Schema.Struct({
    ...InsertComponentFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getTree", "version.list", "version.listHistory"],
  mcp: { name: "insert_component" },
  needs: "project.update",
  output: InsertResultSchema,
  scope: "project",
});

export { insertComponentDirectEdit };
