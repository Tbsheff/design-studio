import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { CreateComponentFields } from "./payload/schema.js";
import { CreateComponentResultSchema } from "./schema.js";

const createComponentDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Turn repeated markup into a React component, like Figma Create component: pass one element, or several look-alike elements. The studio writes the component file in folder, with a prop for each part that differs between the elements and a cva() variant prop when their classes differ. Then it replaces each element with the new component and adds the import. One version and one undo step; undo also removes the new file. Elements that a .map() draws, that a condition shows, that spread props, or whose structure differs are refused with a reason.",
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
    path: "/api/projects/:projectId/d/:directionId/components/create",
  },
  id: "direct-edit.createComponent",
  input: Schema.Struct({
    ...CreateComponentFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [
    "direct-edit.getTree",
    "direct-edit.listComponentFolders",
    "direct-edit.listComponents",
    "direct-edit.listInsertable",
    "version.list",
    "version.listHistory",
  ],
  mcp: { name: "create_component" },
  needs: "project.update",
  output: CreateComponentResultSchema,
  scope: "project",
});

export { createComponentDirectEdit };
