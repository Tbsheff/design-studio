import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { PropsComponentQueryFields } from "./payload/schema.js";
import { PropsComponentSchema } from "./schema.js";

const listPropsComponentsDirectEdit = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_components",
    set: "kit",
    short:
      "Read only. Project components, the shared kit first, with import line, JSX example, parts and cva variants. Use query and cursor.",
  },
  confirm: "none",
  description:
    "Find the React components of the project, shared workspace packages (the kit, such as packages/ui) first, then by use count. Each item has source, file, line, folder, parts, an import line, a JSX example, the use count, and the props schema with control, default and cva variants. Pages hold up to 200 items: pass next as cursor for the next page. Use the names with insert_component and the options with set_props.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/props/components",
  },
  id: "direct-edit.listPropsComponents",
  input: Schema.Struct({
    ...PageFields,
    ...PropsComponentQueryFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_components" },
  needs: "project.read",
  output: pageOf(PropsComponentSchema),
  scope: "project",
});

export { listPropsComponentsDirectEdit };
