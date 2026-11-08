import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { OwnedElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { InsertResultSchema } from "./schema.js";

const deleteTextDirectEdit = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "clear_text",
    set: "core",
    short:
      "Remove the plain text inside an element and keep its child elements.",
  },
  confirm: "none",
  description:
    'Remove the plain text inside an element and keep its child elements, for example the placeholder "Card" that insert_component leaves next to the CardHeader you added. On a library component it clears the text where the page uses it, not in the component file. Text from a prop or a { } expression stays. One version and one undo step.',
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
    path: "/api/projects/:projectId/d/:directionId/insert/clear-text",
  },
  id: "direct-edit.deleteText",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    target: OwnedElementTargetSchema,
  }),
  invalidates: ["direct-edit.getTree", "version.list", "version.listHistory"],
  mcp: { name: "clear_text" },
  needs: "project.update",
  output: InsertResultSchema,
  scope: "project",
});

export { deleteTextDirectEdit };
