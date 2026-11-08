import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { VariantClassFields } from "./payload/schema.js";
import { VariantClassResultSchema } from "./schema.js";

const setVariantClassesDirectEdit = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_variant_classes_direct_edit",
    set: "kit",
    short:
      "Change the classes or style of one cva variant option in a component file. Saves one version.",
  },
  confirm: "none",
  description:
    "Change the classes or style of one cva variant option in a component file. Saves one version.",
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
    path: "/api/projects/:projectId/d/:directionId/props/variant-classes",
  },
  id: "direct-edit.setVariantClasses",
  input: Schema.Struct({
    ...VariantClassFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["version.list", "version.get"],
  mcp: { name: "set_variant_classes_direct_edit" },
  needs: "project.update",
  output: VariantClassResultSchema,
  scope: "project",
});

export { setVariantClassesDirectEdit };
